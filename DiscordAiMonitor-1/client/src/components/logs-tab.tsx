import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Info, AlertTriangle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { SystemLog } from '@/types/discord';
import { useWebSocket } from '@/hooks/use-websocket';

export function LogsTab() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const { lastMessage } = useWebSocket();

  // Fetch initial logs
  const { data: initialLogs } = useQuery({
    queryKey: ['/api/logs'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Update logs from initial fetch
  useEffect(() => {
    if (initialLogs) {
      setLogs(initialLogs);
    }
  }, [initialLogs]);

  // Handle real-time logs from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'log') {
      const newLog = {
        ...lastMessage.data,
        id: Date.now(), // Simple ID for real-time logs
        timestamp: new Date(lastMessage.data.timestamp),
      };
      
      setLogs(prev => [...prev, newLog].slice(-100)); // Keep last 100 logs
    }
  }, [lastMessage]);

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'ERROR': return <AlertCircle className="h-4 w-4 text-red-400" />;
      case 'WARN': return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
      default: return <Info className="h-4 w-4 text-blue-400" />;
    }
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      default: return 'text-green-400';
    }
  };

  const getLogBadgeVariant = (level: string) => {
    switch (level) {
      case 'ERROR': return 'destructive';
      case 'WARN': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6">
      <Card className="discord-bg-secondary discord-border-elevated border">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <FileText className="discord-text-primary mr-3 h-5 w-5" />
            System Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="bg-black rounded-lg p-4 font-mono text-sm h-96">
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-center discord-text-muted py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No logs available. Start monitoring to see system activity.</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={`${log.id}-${log.timestamp}`} className="flex items-start space-x-3 p-2 hover:bg-gray-900 rounded transition-colors">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="text-gray-400 text-xs font-mono whitespace-nowrap">
                        [{format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}]
                      </span>
                      <Badge variant={getLogBadgeVariant(log.level)} className="text-xs">
                        {log.level}
                      </Badge>
                      <span className={getLogColor(log.level)}>{log.message}</span>
                    </div>
                    {getLogIcon(log.level)}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
