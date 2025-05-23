import axios from 'axios';

const DISCORD_API_BASE = 'https://discord.com/api/v9';

export class DiscordUserAPI {
  private token: string;
  private headers: Record<string, string>;

  constructor(token: string) {
    this.token = token;
    // Try different authentication approaches for user tokens
    this.headers = {
      'Authorization': token,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://discord.com',
      'Referer': 'https://discord.com/channels/@me',
      'X-Discord-Locale': 'en-US',
      'X-Debug-Options': 'bugReporterEnabled',
      'X-Super-Properties': 'eyJvcyI6IldpbmRvd3MiLCJicm93c2VyIjoiQ2hyb21lIiwiZGV2aWNlIjoiIiwic3lzdGVtX2xvY2FsZSI6ImVuLVVTIiwiYnJvd3Nlcl91c2VyX2FnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyMC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwiYnJvd3Nlcl92ZXJzaW9uIjoiMTIwLjAuMC4wIiwib3NfdmVyc2lvbiI6IjEwIiwicmVmZXJyZXIiOiIiLCJyZWZlcnJpbmdfZG9tYWluIjoiIiwicmVmZXJyZXJfY3VycmVudCI6IiIsInJlZmVycmluZ19kb21haW5fY3VycmVudCI6IiIsInJlbGVhc2VfY2hhbm5lbCI6InN0YWJsZSIsImNsaWVudF9idWlsZF9udW1iZXIiOjI2OTkyMSwiY2xpZW50X2V2ZW50X3NvdXJjZSI6bnVsbH0='
    };
  }

  async testConnection(): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      console.log('Testing Discord connection with token:', this.token.substring(0, 10) + '...');
      console.log('Headers:', { ...this.headers, Authorization: '[REDACTED]' });
      
      const response = await axios.get(`${DISCORD_API_BASE}/users/@me`, {
        headers: this.headers,
        timeout: 10000
      });
      
      console.log('Discord API response status:', response.status);
      return {
        success: true,
        user: response.data
      };
    } catch (error: any) {
      console.log('Discord API error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Connection failed'
      };
    }
  }

  async getChannel(channelId: string): Promise<{ success: boolean; channel?: any; error?: string }> {
    try {
      const response = await axios.get(`${DISCORD_API_BASE}/channels/${channelId}`, {
        headers: this.headers,
        timeout: 10000
      });
      
      return {
        success: true,
        channel: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Channel access failed'
      };
    }
  }

  async sendMessage(channelId: string, content: string, replyToMessageId?: string): Promise<{ success: boolean; message?: any; error?: string }> {
    try {
      const payload: any = { content };
      
      if (replyToMessageId) {
        payload.message_reference = {
          message_id: replyToMessageId
        };
      }

      const response = await axios.post(`${DISCORD_API_BASE}/channels/${channelId}/messages`, payload, {
        headers: this.headers,
        timeout: 10000
      });
      
      return {
        success: true,
        message: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to send message'
      };
    }
  }

  async getRecentMessages(channelId: string, limit: number = 50): Promise<{ success: boolean; messages?: any[]; error?: string }> {
    try {
      const response = await axios.get(`${DISCORD_API_BASE}/channels/${channelId}/messages`, {
        headers: this.headers,
        params: { limit },
        timeout: 10000
      });
      
      return {
        success: true,
        messages: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch messages'
      };
    }
  }

  async getGuildMembers(guildId: string, limit: number = 100): Promise<{ success: boolean; members?: any[]; error?: string }> {
    try {
      console.log(`Fetching guild members from guild ${guildId} with limit ${limit}`);
      const response = await axios.get(`${DISCORD_API_BASE}/guilds/${guildId}/members?limit=${limit}`, {
        headers: this.headers
      });

      console.log(`Successfully fetched ${response.data.length} guild members`);
      return {
        success: true,
        members: response.data
      };
    } catch (error: any) {
      console.error('Get guild members error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  async getGuildFromChannel(channelId: string): Promise<{ success: boolean; guildId?: string; error?: string }> {
    try {
      const channelResponse = await this.getChannel(channelId);
      if (!channelResponse.success) {
        return { success: false, error: 'Could not fetch channel info' };
      }
      
      const guildId = channelResponse.channel?.guild_id;
      if (!guildId) {
        return { success: false, error: 'Channel is not in a guild (might be a DM)' };
      }

      return { success: true, guildId };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}