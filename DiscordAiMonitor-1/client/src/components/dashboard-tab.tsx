import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Bot, Shield, Play, Pause, Square, Plug, Check, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { MonitoringStatus } from '@/types/discord';

interface DashboardTabProps {
  status: MonitoringStatus | null;
  onStartMonitoring: () => void;
  onStopMonitoring: () => void;
}

export function DashboardTab({ status, onStartMonitoring, onStopMonitoring }: DashboardTabProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; channelName?: string } | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    discordToken: '',
    channelId: '',
    groqApiKey: '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',
    aiModel: 'llama3-70b-8192',
    aiPersonality: 'Helpful, friendly, and professional assistant that provides informative responses while maintaining a conversational tone.',
    filterLevel: 'moderate',
    customBlockedWords: '',
    blockSpam: true,
    blockLinks: true,
    responseDelay: 3,
    maxResponseLength: 500,
  });

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTestConnection = async () => {
    if (!formData.discordToken || !formData.channelId) {
      toast({
        title: "Missing Information",
        description: "Please enter both Discord token and channel ID",
        variant: "destructive",
      });
      return;
    }

    setIsTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const response = await apiRequest('POST', '/api/test-connection', {
        discordToken: formData.discordToken,
        channelId: formData.channelId,
      });
      const result = await response.json();
      
      setConnectionTestResult(result);
      
      if (result.success) {
        toast({
          title: "Connection Successful",
          description: `Connected to channel: ${result.channelName}`,
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleStartMonitoring = async () => {
    if (!formData.discordToken || !formData.channelId) {
      toast({
        title: "Missing Information",
        description: "Please enter both Discord token and channel ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/monitoring/start', formData);
      onStartMonitoring();
      toast({
        title: "Monitoring Started",
        description: "Discord AI monitoring is now active",
      });
    } catch (error) {
      toast({
        title: "Failed to Start Monitoring",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/monitoring/stop', {});
      onStopMonitoring();
      toast({
        title: "Monitoring Stopped",
        description: "Discord AI monitoring has been stopped",
      });
    } catch (error) {
      toast({
        title: "Failed to Stop Monitoring",
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Configuration Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discord Configuration */}
        <Card className="discord-bg-secondary discord-border-elevated border">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Bot className="discord-text-primary mr-3 h-5 w-5" />
              Discord Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="discordToken" className="text-sm font-medium discord-text-muted">
                Discord Token
              </Label>
              <Input
                id="discordToken"
                type="password"
                placeholder="Enter your Discord user token"
                value={formData.discordToken}
                onChange={(e) => setFormData(prev => ({ ...prev, discordToken: e.target.value }))}
                className="discord-bg-elevated discord-border-elevated border text-white placeholder:discord-text-muted"
              />
              <p className="text-xs discord-text-muted mt-1">⚠️ Keep your token secure and never share it</p>
            </div>
            <div>
              <Label htmlFor="channelId" className="text-sm font-medium discord-text-muted">
                Channel ID
              </Label>
              <Input
                id="channelId"
                placeholder="Enter Discord channel ID"
                value={formData.channelId}
                onChange={(e) => setFormData(prev => ({ ...prev, channelId: e.target.value }))}
                className="discord-bg-elevated discord-border-elevated border text-white placeholder:discord-text-muted"
              />
            </div>
            <Button 
              onClick={handleTestConnection} 
              disabled={isTestingConnection}
              className="w-full discord-bg-primary hover:bg-blue-600"
            >
              {isTestingConnection ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : connectionTestResult?.success ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Plug className="mr-2 h-4 w-4" />
              )}
              {isTestingConnection ? 'Testing...' : connectionTestResult?.success ? 'Connection Successful' : 'Test Connection'}
            </Button>
          </CardContent>
        </Card>

        {/* AI Configuration */}
        <Card className="discord-bg-secondary discord-border-elevated border">
          <CardHeader>
            <CardTitle className="flex items-center text-white">
              <Bot className="discord-text-primary mr-3 h-5 w-5" />
              AI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="groqApiKey" className="text-sm font-medium discord-text-muted">
                Groq API Key
              </Label>
              <Input
                id="groqApiKey"
                type="password"
                value={formData.groqApiKey}
                readOnly
                className="discord-bg-elevated discord-border-elevated border text-white"
              />
            </div>
            <div>
              <Label htmlFor="aiModel" className="text-sm font-medium discord-text-muted">
                Model
              </Label>
              <Select value={formData.aiModel} onValueChange={(value) => setFormData(prev => ({ ...prev, aiModel: value }))}>
                <SelectTrigger className="discord-bg-elevated discord-border-elevated border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="discord-bg-elevated discord-border-elevated border">
                  <SelectItem value="llama3-70b-8192">llama3-70b-8192</SelectItem>
                  <SelectItem value="llama3-8b-8192">llama3-8b-8192</SelectItem>
                  <SelectItem value="mixtral-8x7b-32768">mixtral-8x7b-32768</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="aiPersonality" className="text-sm font-medium discord-text-muted">
                Response Personality
              </Label>
              <Textarea
                id="aiPersonality"
                placeholder="Describe how the AI should behave and respond..."
                value={formData.aiPersonality}
                onChange={(e) => setFormData(prev => ({ ...prev, aiPersonality: e.target.value }))}
                className="discord-bg-elevated discord-border-elevated border text-white placeholder:discord-text-muted h-20 resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card className="discord-bg-secondary discord-border-elevated border">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Play className="discord-text-primary mr-3 h-5 w-5" />
            Control Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Button 
              onClick={handleStartMonitoring}
              disabled={isLoading || status?.isActive}
              className="discord-bg-success hover:bg-green-600 text-white"
            >
              <Play className="mr-2 h-4 w-4" />
              {status?.isActive ? 'Monitoring Active' : 'Start Monitoring'}
            </Button>
            <Button 
              disabled={true}
              className="bg-yellow-600 hover:bg-yellow-700 text-black"
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause Monitoring
            </Button>
            <Button 
              onClick={handleStopMonitoring}
              disabled={isLoading || !status?.isActive}
              className="discord-bg-error hover:bg-red-600 text-white"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop Monitoring
            </Button>
          </div>
          
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="discord-bg-elevated p-4 rounded-lg text-center">
              <div className="text-2xl font-bold discord-text-success">
                {status?.stats.messagesProcessed || 0}
              </div>
              <div className="text-sm discord-text-muted">Messages Processed</div>
            </div>
            <div className="discord-bg-elevated p-4 rounded-lg text-center">
              <div className="text-2xl font-bold discord-text-primary">
                {status?.stats.aiResponses || 0}
              </div>
              <div className="text-sm discord-text-muted">AI Responses</div>
            </div>
            <div className="discord-bg-elevated p-4 rounded-lg text-center">
              <div className="text-2xl font-bold discord-text-warning">
                {status?.stats.filteredMessages || 0}
              </div>
              <div className="text-sm discord-text-muted">Filtered Messages</div>
            </div>
            <div className="discord-bg-elevated p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-white">
                {formatUptime(status?.uptime || 0)}
              </div>
              <div className="text-sm discord-text-muted">Uptime</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Filtering Settings */}
      <Card className="discord-bg-secondary discord-border-elevated border">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Shield className="discord-text-primary mr-3 h-5 w-5" />
            Content Filtering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="filterLevel" className="text-sm font-medium discord-text-muted">
                Filter Level
              </Label>
              <Select value={formData.filterLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, filterLevel: value }))}>
                <SelectTrigger className="discord-bg-elevated discord-border-elevated border text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="discord-bg-elevated discord-border-elevated border">
                  <SelectItem value="strict">Strict - Block all inappropriate content</SelectItem>
                  <SelectItem value="moderate">Moderate - Block obvious violations</SelectItem>
                  <SelectItem value="light">Light - Basic filtering only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="customBlockedWords" className="text-sm font-medium discord-text-muted">
                Custom Blocked Words
              </Label>
              <Input
                id="customBlockedWords"
                placeholder="Enter words separated by commas"
                value={formData.customBlockedWords}
                onChange={(e) => setFormData(prev => ({ ...prev, customBlockedWords: e.target.value }))}
                className="discord-bg-elevated discord-border-elevated border text-white placeholder:discord-text-muted"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="blockSpam"
                checked={formData.blockSpam}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, blockSpam: !!checked }))}
              />
              <Label htmlFor="blockSpam" className="text-sm text-white">Block spam messages</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="blockLinks"
                checked={formData.blockLinks}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, blockLinks: !!checked }))}
              />
              <Label htmlFor="blockLinks" className="text-sm text-white">Block suspicious links</Label>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
