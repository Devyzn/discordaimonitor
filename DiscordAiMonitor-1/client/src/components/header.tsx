import { Button } from "@/components/ui/button";
import { StopCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  activeTab: string;
  monitoringStatus: {
    isActive: boolean;
    connected: boolean;
  };
  onEmergencyStop: () => void;
}

const tabTitles = {
  dashboard: 'Discord AI Monitoring Dashboard',
  console: 'Chat Console',
  settings: 'Settings',
  logs: 'System Logs',
};

const tabDescriptions = {
  dashboard: 'Monitor and automate Discord channel interactions',
  console: 'Real-time chat monitoring and AI responses',
  settings: 'Configure monitoring parameters',
  logs: 'View system activity and error logs',
};

export function Header({ activeTab, monitoringStatus, onEmergencyStop }: HeaderProps) {
  const getStatusText = () => {
    if (!monitoringStatus.connected) return 'Disconnected';
    if (monitoringStatus.isActive) return 'Monitoring Active';
    return 'Standby';
  };

  const getStatusColor = () => {
    if (!monitoringStatus.connected) return 'discord-text-error';
    if (monitoringStatus.isActive) return 'discord-text-success';
    return 'discord-text-warning';
  };

  return (
    <header className="discord-bg-secondary discord-border-elevated border-b p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {tabTitles[activeTab as keyof typeof tabTitles] || 'Dashboard'}
          </h2>
          <p className="discord-text-muted text-sm">
            {tabDescriptions[activeTab as keyof typeof tabDescriptions] || 'Monitor and automate Discord channel interactions'}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 discord-bg-elevated px-3 py-2 rounded-lg">
            <Circle 
              className={cn(
                "h-2 w-2 rounded-full fill-current",
                getStatusColor(),
                monitoringStatus.isActive && "animate-pulse"
              )}
            />
            <span className={cn("text-sm font-medium", getStatusColor())}>
              {getStatusText()}
            </span>
          </div>
          <Button 
            onClick={onEmergencyStop}
            variant="destructive"
            size="sm"
            className="discord-bg-error hover:bg-red-600"
          >
            <StopCircle className="mr-2 h-4 w-4" />
            Emergency Stop
          </Button>
        </div>
      </div>
    </header>
  );
}
