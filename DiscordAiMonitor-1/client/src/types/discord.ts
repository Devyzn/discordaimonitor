export interface DiscordUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  status: 'online' | 'away' | 'busy' | 'offline';
}

export interface DiscordMessage {
  id: number;
  messageId: string;
  channelId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  timestamp: Date;
  isAiResponse: boolean;
  replyToMessageId: string | null;
  wasFiltered: boolean;
}

export interface MonitoringStatus {
  isActive: boolean;
  session: any;
  stats: {
    messagesProcessed: number;
    aiResponses: number;
    filteredMessages: number;
  };
  uptime: number;
  connected: boolean;
}

export interface SystemLog {
  id: number;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  timestamp: Date;
  sessionId?: number;
}

export interface WebSocketMessage {
  type: 'message' | 'log' | 'monitoring_stopped' | 'status_update';
  data: any;
}
