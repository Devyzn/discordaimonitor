import { cn } from "@/lib/utils";
import { Bot, Home, MessageCircle, Settings, FileText, Circle, Users } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DiscordUser } from '@/types/discord';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isConnected: boolean;
  channelId?: string;
}

const navigationItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'console', label: 'Chat Console', icon: MessageCircle },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'logs', label: 'Logs', icon: FileText },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'online': return 'text-green-400';
    case 'away': return 'text-yellow-400';
    case 'busy': return 'text-red-400';
    default: return 'text-gray-400';
  }
};

export function Sidebar({ activeTab, onTabChange, isConnected, channelId }: SidebarProps) {
  // Fetch real Discord server members
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['/api/guild-members', channelId],
    enabled: !!channelId && isConnected,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  return (
    <div className="w-64 discord-bg-secondary flex flex-col discord-border-elevated border-r">
      <div className="p-4 discord-border-elevated border-b">
        <h1 className="text-xl font-bold text-white flex items-center">
          <Bot className="discord-text-primary mr-3 h-6 w-6" />
          AI Monitor
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center w-full px-3 py-2 rounded-lg transition-colors text-left",
                isActive
                  ? "discord-bg-primary text-white"
                  : "discord-text-muted hover:discord-bg-elevated hover:text-white"
              )}
            >
              <Icon className="mr-3 h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 discord-border-elevated border-t">
        <div className="flex items-center space-x-2">
          <Circle 
            className={cn(
              "h-2 w-2 rounded-full",
              isConnected ? "discord-text-success fill-current" : "discord-text-error fill-current"
            )}
          />
          <span className="text-sm discord-text-muted">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>
    </div>
  );
}
