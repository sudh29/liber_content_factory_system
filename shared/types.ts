export interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  characterLimit: number;
  formatTemplate: string;
  themeColor: string;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  source?: string;
  status: 'Unpublished' | 'Scheduled' | 'Published';
  scheduledTime?: string;
  publishedTime?: string;
  publishedPlatforms?: string[];
  engagement?: {
    impressions: number;
    likes: number;
    shares: number;
  };
  errorMessage?: string;
}

export interface IntegrationCredentials {
  telegramBotToken: string;
  telegramChatId: string;
  webhookUrl: string;
  slackWebhookUrl: string;
  mockSettings: {
    simulateFailures: boolean;
    autoTrackEngagement: boolean;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'RETRY';
  message: string;
  quoteId?: string;
  platforms?: string[];
}
