import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import axios from "axios";
import { storage } from "./storage";
import { insertMonitoringSessionSchema, insertDiscordMessageSchema } from "@shared/schema";
import { z } from "zod";
import { DiscordUserAPI } from "./discord-api";

// Groq AI integration
import Groq from "groq-sdk";

interface MonitoringState {
  discordAPI: any | null;
  groq: Groq | null;
  session: any;
  startTime: Date | null;
  messagePolling: NodeJS.Timeout | null;
  lastMessageId: string | null;
}

const state: MonitoringState = {
  discordAPI: null,
  groq: null,
  session: null,
  startTime: null,
  messagePolling: null,
  lastMessageId: null,
};

// Content filtering
const badWords = [
  'damn', 'shit', 'fuck', 'bitch', 'asshole', 'bastard', 'crap', 'piss',
  'hell', 'stupid', 'idiot', 'moron', 'retard', 'gay', 'fag', 'nigger',
  'whore', 'slut', 'cunt', 'dick', 'cock', 'pussy', 'tits', 'boobs'
];

function containsProfanity(text: string, customWords: string[] = []): boolean {
  const allWords = [...badWords, ...customWords];
  const lowerText = text.toLowerCase();
  return allWords.some(word => lowerText.includes(word.toLowerCase()));
}

function containsSuspiciousLinks(text: string): boolean {
  const suspiciousPatterns = [
    /bit\.ly\/\w+/gi,
    /tinyurl\.com\/\w+/gi,
    /discord\.gg\/\w+/gi,
    /\w+\.tk\b/gi,
    /\w+\.ml\b/gi,
    /free.*download/gi,
    /click.*here.*now/gi
  ];
  
  return suspiciousPatterns.some(pattern => pattern.test(text));
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      clients.delete(ws);
      console.log('WebSocket client disconnected');
    });
  });

  function broadcastToClients(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  async function logMessage(level: string, message: string) {
    const log = await storage.addLog({
      level,
      message,
      sessionId: state.session?.id || null
    });
    
    broadcastToClients({
      type: 'log',
      data: { level, message, timestamp: new Date().toISOString() }
    });
  }

  // Test Discord connection
  app.post('/api/test-connection', async (req, res) => {
    try {
      const { discordToken, channelId } = req.body;
      
      console.log('Received request body:', { 
        discordTokenLength: discordToken?.length, 
        channelId, 
        tokenStart: discordToken?.substring(0, 20) + '...' 
      });
      
      if (!discordToken || !channelId) {
        return res.status(400).json({ 
          success: false, 
          message: 'Discord token and channel ID are required' 
        });
      }

      // Clean the token - remove any extra whitespace or quotes
      const cleanToken = discordToken.trim().replace(/['"]/g, '');
      console.log('Cleaned token length:', cleanToken.length, 'First 20 chars:', cleanToken.substring(0, 20) + '...');
      
      const discordAPI = new DiscordUserAPI(cleanToken);
      
      // Test user authentication
      const userResult = await discordAPI.testConnection();
      if (!userResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: userResult.error || 'Invalid Discord token'
        });
      }
      
      // Test channel access
      const channelResult = await discordAPI.getChannel(channelId);
      if (!channelResult.success) {
        return res.status(400).json({ 
          success: false, 
          message: channelResult.error || 'Cannot access channel'
        });
      }
      
      const channel = channelResult.channel;
      const channelName = channel.name || 'Direct Message';
      
      res.json({ 
        success: true, 
        channelName,
        userId: userResult.user.id,
        username: userResult.user.username
      });
      
    } catch (error) {
      console.error('Discord connection test error:', error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  });

  // Start monitoring
  app.post('/api/monitoring/start', async (req, res) => {
    try {
      const sessionData = insertMonitoringSessionSchema.parse(req.body);
      
      // Stop any existing session
      if (state.messagePolling) {
        clearInterval(state.messagePolling);
        state.messagePolling = null;
      }
      
      // Validate Discord connection
      const discordAPI = new DiscordUserAPI(sessionData.discordToken);
      const connectionTest = await discordAPI.testConnection();
      if (!connectionTest.success) {
        return res.status(400).json({ message: 'Invalid Discord token' });
      }

      // Test channel access
      const channelTest = await discordAPI.getChannel(sessionData.channelId);
      if (!channelTest.success) {
        return res.status(400).json({ message: 'Cannot access channel' });
      }
      
      // Create new session
      const session = await storage.createSession({
        ...sessionData,
        isActive: true,
      });
      
      state.session = session;
      state.startTime = new Date();
      state.discordAPI = discordAPI;
      
      // Initialize Groq client
      state.groq = new Groq({
        apiKey: session.groqApiKey,
      });
      
      // Start message polling
      await startMessagePolling();
      
      await logMessage('INFO', `Discord AI Monitor started for channel ${session.channelId}`);
      
      res.json({ success: true, sessionId: session.id });
    } catch (error) {
      console.error('Start monitoring error:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Message polling function
  async function startMessagePolling() {
    if (!state.discordAPI || !state.session) return;

    // Get recent messages to establish baseline
    const recentMessages = await state.discordAPI.getRecentMessages(state.session.channelId, 1);
    if (recentMessages.success && recentMessages.messages && recentMessages.messages.length > 0) {
      state.lastMessageId = recentMessages.messages[0].id;
    }

    await logMessage('INFO', 'Started message polling for new messages');

    // Poll for new messages every 2 seconds
    state.messagePolling = setInterval(async () => {
      try {
        if (!state.discordAPI || !state.session) return;

        const messages = await state.discordAPI.getRecentMessages(state.session.channelId, 50);
        if (!messages.success || !messages.messages) return;

        // Filter only new messages
        const newMessages = state.lastMessageId 
          ? messages.messages.filter((msg: any) => msg.id > state.lastMessageId!)
          : messages.messages.slice(0, 1); // Just get the latest if no baseline

        for (const message of newMessages.reverse()) { // Process oldest first
          await processDiscordMessage(message);
        }

        // Update last seen message ID
        if (messages.messages.length > 0) {
          state.lastMessageId = messages.messages[0].id;
        }
      } catch (error) {
        console.error('Message polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  }

  async function processDiscordMessage(message: any) {
    if (!state.session || message.author?.bot || message.channel_id !== state.session.channelId) return;
    
    try {
      // Save original message to our database and broadcast to frontend
      const discordMessage = await storage.saveMessage({
        messageId: message.id,
        channelId: message.channel_id,
        authorId: message.author.id,
        authorName: message.author.global_name || message.author.username,
        authorAvatar: message.author.avatar ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png` : null,
        content: message.content,
        timestamp: new Date(message.timestamp),
        isAiResponse: false,
        wasFiltered: false,
      });
      
      // Broadcast message to frontend clients
      broadcastToClients({
        type: 'message',
        data: discordMessage
      });
      
      await logMessage('INFO', `New message from ${message.author.username}: ${message.content.substring(0, 50)}...`);
      
      // Content filtering
      const customWords = state.session.customBlockedWords ? state.session.customBlockedWords.split(',').map((w: string) => w.trim()) : [];
      let shouldFilter = false;
      let filterReason = '';
      
      if (state.session.filterLevel !== 'light') {
        if (containsProfanity(message.content, customWords)) {
          shouldFilter = true;
          filterReason = 'profanity';
        } else if (state.session.blockLinks && containsSuspiciousLinks(message.content)) {
          shouldFilter = true;
          filterReason = 'suspicious links';
        } else if (state.session.blockSpam && message.content.length > 500) {
          shouldFilter = true;
          filterReason = 'potential spam';
        }
      }
      
      if (shouldFilter) {
        await logMessage('WARN', `Message filtered due to ${filterReason}`);
        return;
      }
      
      // Check if we should respond (questions, mentions of AI/bot, etc.)
      const shouldRespond = message.content.toLowerCase().includes('ai') ||
                           message.content.toLowerCase().includes('bot') ||
                           message.content.includes('?') ||
                           message.message_reference; // This is a reply
      
      if (shouldRespond && state.groq && state.discordAPI) {
        await logMessage('INFO', 'Generating AI response...');
        
        try {
          const completion = await state.groq.chat.completions.create({
            messages: [
              {
                role: "system",
                content: `${state.session.aiPersonality} Keep responses under ${state.session.maxResponseLength || 500} characters. Be helpful and conversational.`
              },
              {
                role: "user",
                content: message.content
              }
            ],
            model: state.session.aiModel,
            max_tokens: Math.floor((state.session.maxResponseLength || 500) / 4),
            temperature: 0.7,
          });
          
          const aiResponse = completion.choices[0]?.message?.content;
          
          if (aiResponse) {
            // Add response delay
            setTimeout(async () => {
              try {
                // Send AI response using Discord API
                const replyToMessageId = message.message_reference?.message_id || message.id;
                const sentResponse = await state.discordAPI!.sendMessage(
                  state.session!.channelId, 
                  aiResponse, 
                  replyToMessageId
                );
                
                if (sentResponse.success) {
                  // Save AI response to database
                  const aiDiscordMessage = await storage.saveMessage({
                    messageId: sentResponse.message.id,
                    channelId: sentResponse.message.channel_id,
                    authorId: sentResponse.message.author.id,
                    authorName: 'AI Assistant',
                    authorAvatar: sentResponse.message.author.avatar ? `https://cdn.discordapp.com/avatars/${sentResponse.message.author.id}/${sentResponse.message.author.avatar}.png` : null,
                    content: aiResponse,
                    timestamp: new Date(sentResponse.message.timestamp),
                    isAiResponse: true,
                    replyToMessageId: message.id,
                    wasFiltered: false,
                  });
                  
                  // Broadcast AI response to frontend
                  broadcastToClients({
                    type: 'message',
                    data: aiDiscordMessage
                  });
                  
                  await logMessage('INFO', 'AI response sent successfully');
                } else {
                  await logMessage('ERROR', `Failed to send AI response: ${sentResponse.error}`);
                }
              } catch (error) {
                await logMessage('ERROR', `Failed to send AI response: ${error}`);
              }
            }, (state.session.responseDelay || 3) * 1000);
          }
        } catch (error) {
          await logMessage('ERROR', `Groq API error: ${error}`);
        }
      }
    } catch (error) {
      await logMessage('ERROR', `Message processing error: ${error}`);
    }
  }

  // Stop monitoring
  app.post('/api/monitoring/stop', async (req, res) => {
    try {
      if (state.messagePolling) {
        clearInterval(state.messagePolling);
        state.messagePolling = null;
      }
      
      if (state.session) {
        await storage.stopSession(state.session.id);
        await logMessage('INFO', 'Discord monitoring stopped');
      }
      
      state.session = null;
      state.startTime = null;
      state.discordAPI = null;
      state.groq = null;
      state.lastMessageId = null;
      
      broadcastToClients({
        type: 'monitoring_stopped',
        data: { timestamp: new Date() }
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Stop monitoring error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get monitoring status
  app.get('/api/monitoring/status', async (req, res) => {
    try {
      const stats = await storage.getStats();
      
      res.json({
        isActive: !!state.session?.isActive,
        session: state.session,
        stats,
        uptime: state.startTime ? Math.floor((Date.now() - state.startTime.getTime()) / 1000) : 0,
        connected: !!state.discordAPI
      });
    } catch (error) {
      console.error('Status error:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get recent messages
  app.get('/api/messages/:channelId', async (req, res) => {
    try {
      const { channelId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      
      const messages = await storage.getRecentMessages(channelId, limit);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get recent logs
  app.get('/api/logs', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getRecentLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get real Discord server members
  app.get('/api/guild-members/:channelId', async (req, res) => {
    try {
      const { channelId } = req.params;
      
      if (!state.discordAPI) {
        return res.status(400).json({ message: 'No active Discord connection' });
      }

      // Get guild ID from channel
      const guildInfo = await state.discordAPI.getGuildFromChannel(channelId);
      if (!guildInfo.success) {
        return res.status(400).json({ message: guildInfo.error });
      }

      // Fetch guild members
      const membersResponse = await state.discordAPI.getGuildMembers(guildInfo.guildId, 50);
      if (!membersResponse.success) {
        return res.status(400).json({ message: membersResponse.error });
      }

      // Transform to our format
      const members = membersResponse.members?.map((member: any) => ({
        id: member.user.id,
        username: member.user.username,
        displayName: member.nick || member.user.global_name || member.user.username,
        avatar: member.user.avatar ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png` : null,
        status: 'online' // Note: We can't get real-time status via REST API, only via Gateway
      })) || [];

      res.json(members);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  return httpServer;
}