import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Hash, Eye, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { DiscordMessage } from '@/types/discord';
import { useWebSocket } from '@/hooks/use-websocket';

interface ChatConsoleTabProps {
  channelId?: string;
}

export function ChatConsoleTab({ channelId }: ChatConsoleTabProps) {
  const [messages, setMessages] = useState<DiscordMessage[]>([]);
  const { lastMessage } = useWebSocket();

  // Fetch initial messages
  const { data: initialMessages } = useQuery({
    queryKey: ['/api/messages', channelId],
    enabled: !!channelId,
  });

  // Update messages from initial fetch
  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Handle real-time messages from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'message') {
      const newMessage = {
        ...lastMessage.data,
        timestamp: new Date(lastMessage.data.timestamp),
      };
      
      setMessages(prev => {
        // Check if message already exists
        if (prev.some(msg => msg.messageId === newMessage.messageId)) {
          return prev;
        }
        return [...prev, newMessage];
      });
    }
  }, [lastMessage]);

  const mockOnlineMembers = [
    {
      id: '1',
      displayName: 'John Doe',
      status: 'online' as const,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop&crop=face',
    },
    {
      id: '2',
      displayName: 'Sarah Wilson',
      status: 'online' as const,
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=32&h=32&fit=crop&crop=face',
    },
    {
      id: '3',
      displayName: 'Mike Chen',
      status: 'away' as const,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'discord-text-success';
      case 'away': return 'discord-text-warning';
      case 'busy': return 'discord-text-error';
      default: return 'discord-text-muted';
    }
  };

  return (
    <div className="h-full flex">
      {/* Channel Info Sidebar */}
      <div className="w-80 discord-bg-secondary discord-border-elevated border-r flex flex-col">
        <div className="p-4 discord-border-elevated border-b">
          <h3 className="font-semibold text-white flex items-center">
            <Hash className="discord-text-muted mr-2 h-4 w-4" />
            <span>general</span>
          </h3>
          <p className="text-xs discord-text-muted mt-1">Channel description will appear here</p>
        </div>
        
        {/* Online Members */}
        <div className="flex-1 overflow-auto p-4">
          <h4 className="text-xs font-semibold discord-text-muted uppercase tracking-wider mb-3">
            Online Members
          </h4>
          <div className="space-y-2">
            {mockOnlineMembers.map((member) => (
              <div 
                key={member.id}
                className="flex items-center space-x-3 p-2 rounded hover:discord-bg-elevated transition-colors"
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={member.avatar} alt={member.displayName} />
                  <AvatarFallback>{member.displayName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium text-white">{member.displayName}</div>
                  <div className={`text-xs capitalize ${getStatusColor(member.status)}`}>
                    {member.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 flex flex-col discord-bg-background">
        {/* Messages Container */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center discord-text-muted py-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet. Start monitoring to see live chat.</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.messageId}
                  className={`flex space-x-3 hover:bg-black hover:bg-opacity-20 p-2 rounded transition-colors ${
                    message.isAiResponse ? 'bg-blue-600 bg-opacity-10 discord-border-primary border-l-4' : ''
                  }`}
                >
                  {message.isAiResponse ? (
                    <div className="w-10 h-10 rounded-full discord-bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="text-white h-4 w-4" />
                    </div>
                  ) : (
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={message.authorAvatar || undefined} alt={message.authorName} />
                      <AvatarFallback>{message.authorName[0]}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2 mb-1">
                      <span className={`font-medium ${message.isAiResponse ? 'discord-text-primary' : 'text-white'}`}>
                        {message.authorName}
                      </span>
                      {message.isAiResponse && (
                        <Badge variant="secondary" className="discord-bg-primary text-white text-xs px-2 py-0.5">
                          BOT
                        </Badge>
                      )}
                      <span className="text-xs discord-text-muted">
                        {format(new Date(message.timestamp), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div className="text-white break-words">{message.content}</div>
                    {message.wasFiltered && (
                      <div className="mt-1">
                        <Badge variant="destructive" className="text-xs">
                          Filtered
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Message Input (Read-only for monitoring) */}
        <div className="p-4 discord-border-elevated border-t">
          <div className="discord-bg-elevated rounded-lg p-3 discord-text-muted flex items-center">
            <Eye className="mr-2 h-4 w-4" />
            Monitoring mode - AI will respond automatically to messages
          </div>
        </div>
      </div>
    </div>
  );
}
