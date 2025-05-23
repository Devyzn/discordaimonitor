import { monitoringSessions, discordMessages, systemLogs, type MonitoringSession, type InsertMonitoringSession, type DiscordMessage, type InsertDiscordMessage, type SystemLog, type InsertSystemLog } from "@shared/schema";

export interface IStorage {
  // Monitoring Sessions
  createSession(session: InsertMonitoringSession): Promise<MonitoringSession>;
  getActiveSession(): Promise<MonitoringSession | undefined>;
  updateSession(id: number, updates: Partial<InsertMonitoringSession>): Promise<MonitoringSession | undefined>;
  stopSession(id: number): Promise<void>;

  // Discord Messages
  saveMessage(message: InsertDiscordMessage): Promise<DiscordMessage>;
  getRecentMessages(channelId: string, limit?: number): Promise<DiscordMessage[]>;
  getMessageById(messageId: string): Promise<DiscordMessage | undefined>;

  // System Logs
  addLog(log: InsertSystemLog): Promise<SystemLog>;
  getRecentLogs(limit?: number): Promise<SystemLog[]>;

  // Statistics
  getStats(): Promise<{
    messagesProcessed: number;
    aiResponses: number;
    filteredMessages: number;
  }>;
}

export class MemStorage implements IStorage {
  private sessions: Map<number, MonitoringSession>;
  private messages: Map<string, DiscordMessage>;
  private logs: Map<number, SystemLog>;
  private currentSessionId: number;
  private currentMessageId: number;
  private currentLogId: number;

  constructor() {
    this.sessions = new Map();
    this.messages = new Map();
    this.logs = new Map();
    this.currentSessionId = 1;
    this.currentMessageId = 1;
    this.currentLogId = 1;
  }

  async createSession(insertSession: InsertMonitoringSession): Promise<MonitoringSession> {
    // Stop any existing active session
    for (const [id, session] of this.sessions) {
      if (session.isActive) {
        session.isActive = false;
      }
    }

    const id = this.currentSessionId++;
    const session: MonitoringSession = {
      ...insertSession,
      id,
      createdAt: new Date(),
    };
    this.sessions.set(id, session);
    return session;
  }

  async getActiveSession(): Promise<MonitoringSession | undefined> {
    return Array.from(this.sessions.values()).find(session => session.isActive);
  }

  async updateSession(id: number, updates: Partial<InsertMonitoringSession>): Promise<MonitoringSession | undefined> {
    const session = this.sessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  async stopSession(id: number): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.isActive = false;
    }
  }

  async saveMessage(insertMessage: InsertDiscordMessage): Promise<DiscordMessage> {
    const id = this.currentMessageId++;
    const message: DiscordMessage = {
      ...insertMessage,
      id,
    };
    this.messages.set(message.messageId, message);
    return message;
  }

  async getRecentMessages(channelId: string, limit: number = 50): Promise<DiscordMessage[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.channelId === channelId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .reverse();
  }

  async getMessageById(messageId: string): Promise<DiscordMessage | undefined> {
    return this.messages.get(messageId);
  }

  async addLog(insertLog: InsertSystemLog): Promise<SystemLog> {
    const id = this.currentLogId++;
    const log: SystemLog = {
      ...insertLog,
      id,
      timestamp: new Date(),
    };
    this.logs.set(id, log);
    return log;
  }

  async getRecentLogs(limit: number = 100): Promise<SystemLog[]> {
    return Array.from(this.logs.values())
      .sort((a, b) => b.timestamp!.getTime() - a.timestamp!.getTime())
      .slice(0, limit)
      .reverse();
  }

  async getStats(): Promise<{
    messagesProcessed: number;
    aiResponses: number;
    filteredMessages: number;
  }> {
    const messages = Array.from(this.messages.values());
    return {
      messagesProcessed: messages.length,
      aiResponses: messages.filter(msg => msg.isAiResponse).length,
      filteredMessages: messages.filter(msg => msg.wasFiltered).length,
    };
  }
}

export const storage = new MemStorage();
