import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Settings } from 'lucide-react';

export function SettingsTab() {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    responseDelay: 3,
    maxResponseLength: 500,
    enableLogging: true,
    autoRestart: false,
  });

  const handleSaveSettings = () => {
    // In a real app, this would save to the backend
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="p-6 space-y-6">
      <Card className="discord-bg-secondary discord-border-elevated border">
        <CardHeader>
          <CardTitle className="flex items-center text-white">
            <Settings className="discord-text-primary mr-3 h-5 w-5" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="responseDelay" className="text-sm font-medium discord-text-muted">
                Response Delay (seconds)
              </Label>
              <Input
                id="responseDelay"
                type="number"
                min="1"
                max="30"
                value={settings.responseDelay}
                onChange={(e) => setSettings(prev => ({ ...prev, responseDelay: parseInt(e.target.value) || 3 }))}
                className="discord-bg-elevated discord-border-elevated border text-white"
              />
              <p className="text-xs discord-text-muted mt-1">
                Delay before AI responds to avoid appearing too robotic
              </p>
            </div>
            <div>
              <Label htmlFor="maxResponseLength" className="text-sm font-medium discord-text-muted">
                Max Response Length
              </Label>
              <Input
                id="maxResponseLength"
                type="number"
                min="50"
                max="2000"
                value={settings.maxResponseLength}
                onChange={(e) => setSettings(prev => ({ ...prev, maxResponseLength: parseInt(e.target.value) || 500 }))}
                className="discord-bg-elevated discord-border-elevated border text-white"
              />
              <p className="text-xs discord-text-muted mt-1">
                Maximum character limit for AI responses
              </p>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              className="discord-bg-primary hover:bg-blue-600"
            >
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="discord-bg-secondary discord-border-elevated border">
        <CardHeader>
          <CardTitle className="text-white">Usage Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm discord-text-muted">
          <div>
            <h4 className="font-medium text-white mb-2">Discord Token Security</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Never share your Discord token with anyone</li>
              <li>Use a dedicated account for automation if possible</li>
              <li>Be aware that using user tokens for automation may violate Discord's ToS</li>
              <li>Monitor token usage and revoke if compromised</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-2">AI Response Best Practices</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Set appropriate response delays to appear more natural</li>
              <li>Customize AI personality to match your community tone</li>
              <li>Enable content filtering to maintain community standards</li>
              <li>Monitor AI responses for quality and appropriateness</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-medium text-white mb-2">Rate Limiting</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Discord API has rate limits - the system will respect them</li>
              <li>High-frequency channels may trigger rate limiting</li>
              <li>Consider response frequency when monitoring busy channels</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
