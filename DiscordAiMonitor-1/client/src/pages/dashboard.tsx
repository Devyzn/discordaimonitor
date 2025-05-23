import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from '@/components/sidebar';
import { Header } from '@/components/header';
import { DashboardTab } from '@/components/dashboard-tab';
import { ChatConsoleTab } from '@/components/chat-console-tab';
import { SettingsTab } from '@/components/settings-tab';
import { LogsTab } from '@/components/logs-tab';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { MonitoringStatus } from '@/types/discord';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isConnected, lastMessage } = useWebSocket();
  const { toast } = useToast();

  // Fetch monitoring status
  const { data: status, refetch: refetchStatus } = useQuery<MonitoringStatus>({
    queryKey: ['/api/monitoring/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage?.type === 'monitoring_stopped') {
      refetchStatus();
      toast({
        title: "Monitoring Stopped",
        description: "Discord monitoring has been stopped",
        variant: "destructive",
      });
    }
  }, [lastMessage, refetchStatus, toast]);

  const handleEmergencyStop = async () => {
    try {
      await apiRequest('POST', '/api/monitoring/stop', {});
      refetchStatus();
      toast({
        title: "Emergency Stop Activated",
        description: "All monitoring has been stopped immediately",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Emergency Stop Failed",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardTab
            status={status || null}
            onStartMonitoring={() => refetchStatus()}
            onStopMonitoring={() => refetchStatus()}
          />
        );
      case 'console':
        return <ChatConsoleTab channelId={status?.session?.channelId} />;
      case 'settings':
        return <SettingsTab />;
      case 'logs':
        return <LogsTab />;
      default:
        return <DashboardTab status={status || null} onStartMonitoring={() => refetchStatus()} onStopMonitoring={() => refetchStatus()} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden discord-bg-background">
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        isConnected={isConnected}
        channelId={status?.session?.channelId}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          activeTab={activeTab}
          monitoringStatus={{
            isActive: status?.isActive || false,
            connected: status?.connected || false,
          }}
          onEmergencyStop={handleEmergencyStop}
        />
        
        <div className="flex-1 overflow-auto">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}
