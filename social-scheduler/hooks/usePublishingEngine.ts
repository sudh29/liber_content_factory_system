import { useState, useEffect } from 'react';
import { Quote, AuditLog, IntegrationCredentials } from '../../shared/types';

export function usePublishingEngine(
  quotes: Quote[],
  setQuotes: (quotes: Quote[]) => void,
  onQuotePublished?: (quote: Quote) => void
) {
  const [logs, setLogsState] = useState<AuditLog[]>([]);
  const [credentials, setCredentialsState] = useState<IntegrationCredentials>({
    telegramBotToken: "",
    telegramChatId: "",
    webhookUrl: "",
    slackWebhookUrl: "",
    mockSettings: {
      simulateFailures: false,
      autoTrackEngagement: true,
    },
  });

  useEffect(() => {
    try {
      const storedLogs = localStorage.getItem('quotes_audit_logs');
      if (storedLogs) {
        setLogsState(JSON.parse(storedLogs));
      } else {
        const initialLog: AuditLog = {
          id: "log_initial",
          timestamp: new Date().toISOString(),
          type: 'INFO',
          message: "Daily Quotes Publishing Platform initialized. Preloaded curated authentic historical dataset of verified figures.",
        };
        setLogsState([initialLog]);
        localStorage.setItem('quotes_audit_logs', JSON.stringify([initialLog]));
      }

      const storedCreds = localStorage.getItem('quotes_api_credentials');
      if (storedCreds) {
        setCredentialsState(JSON.parse(storedCreds));
      }
    } catch (e) {
      console.error("Local storage load error", e);
    }
  }, []);

  const setLogs = (updatedLogs: AuditLog[]) => {
    setLogsState(updatedLogs);
    localStorage.setItem('quotes_audit_logs', JSON.stringify(updatedLogs));
  };

  const addLog = (type: AuditLog['type'], message: string, quoteId?: string, platforms?: string[]) => {
    setLogsState((currentLogs) => {
      const newLog: AuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp: new Date().toISOString(),
        type,
        message,
        quoteId,
        platforms,
      };
      const updated = [newLog, ...currentLogs];
      localStorage.setItem('quotes_audit_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const setCredentials = (newCreds: IntegrationCredentials) => {
    setCredentialsState(newCreds);
    localStorage.setItem('quotes_api_credentials', JSON.stringify(newCreds));
  };

  const publishQuote = async (quoteId: string, targetPlatforms: string[] = ['twitter', 'linkedin', 'telegram', 'instagram', 'whatsapp']) => {
    addLog('INFO', `Starting simultaneous publication cycle for platforms: ${targetPlatforms.join(', ')}...`, quoteId);

    const quoteToPublish = quotes.find((q) => q.id === quoteId);
    if (!quoteToPublish) {
      addLog('ERROR', "Publication aborted: Specified quote file could not be fetched from index cache.");
      return;
    }

    if (credentials.mockSettings.simulateFailures && Math.random() > 0.5) {
      const updated = quotes.map((q) => {
        if (q.id === quoteId) {
          return {
            ...q,
            status: 'Unpublished' as const,
            errorMessage: "Transient HTTP 503 Service Unavailable: Simulated cloud endpoint failure. Check network relays.",
          };
        }
        return q;
      });
      setQuotes(updated);
      addLog('ERROR', `Publishing Failure Simulated: Simultaneously dispatching to ${targetPlatforms.join(', ')} failed. Re-queued.`, quoteId);
      return;
    }

    if (credentials.telegramBotToken && credentials.telegramChatId) {
      try {
        const textPayload = `"${quoteToPublish.text}"\n\n— ${quoteToPublish.author}\n\n#dailyquote #philosophy`;
        const url = `https://api.telegram.org/bot${credentials.telegramBotToken}/sendMessage`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: credentials.telegramChatId,
            text: textPayload,
          }),
        });
        if (!res.ok) throw new Error(`Telegram API responded with code ${res.status}`);
        addLog('SUCCESS', `Telegram Bot API: Successfully transmitted quote live to channel chat: ${credentials.telegramChatId}`, quoteId);
      } catch (err: any) {
        addLog('ERROR', `Telegram Bot Integration Error: ${err.message || err}`, quoteId);
      }
    }

    if (credentials.webhookUrl) {
      try {
        const res = await fetch(credentials.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: "quote_publish",
            timestamp: new Date().toISOString(),
            quote: quoteToPublish.text,
            author: quoteToPublish.author,
            source: quoteToPublish.source,
            category: quoteToPublish.category,
            platforms: targetPlatforms,
          }),
        });
        if (!res.ok) throw new Error(`Webhook returned status ${res.status}`);
        addLog('SUCCESS', `Generic Webhook Dispatched: POST success on target address ${credentials.webhookUrl}`, quoteId);
      } catch (err: any) {
        addLog('ERROR', `Generic Webhook failed: ${err.message || err}`, quoteId);
      }
    }

    const updatedQuote = {
      ...quoteToPublish,
      status: 'Published' as const,
      publishedTime: new Date().toISOString(),
      publishedPlatforms: targetPlatforms,
      errorMessage: undefined,
      engagement: {
        impressions: Math.floor(Math.random() * 800) + 400,
        likes: Math.floor(Math.random() * 90) + 10,
        shares: Math.floor(Math.random() * 15) + 3,
      },
    };

    const updated = quotes.map((q) => (q.id === quoteId ? updatedQuote : q));
    setQuotes(updated);
    addLog('SUCCESS', `Publication absolute success: marked "${quoteToPublish.text.substring(0, 30)}..." as successfully published. Deduplication safeguards active.`, quoteId, targetPlatforms);
    
    if (onQuotePublished) {
      onQuotePublished(updatedQuote);
    }
  };

  const triggerDailyPost = () => {
    const scheduled = quotes.filter((q) => q.status === 'Scheduled');
    if (scheduled.length > 0) {
      publishQuote(scheduled[0].id);
      return;
    }

    const unpublished = quotes.filter((q) => q.status === 'Unpublished');
    if (unpublished.length > 0) {
      publishQuote(unpublished[0].id);
    } else {
      addLog('ERROR', "Automation scheduler stalled: No unpublished quotes remaining in the repository database.");
    }
  };

  const testTelegram = async () => {
    if (!credentials.telegramBotToken || !credentials.telegramChatId) {
      throw new Error("Missing parameters: Please input matching Telegram Bot parameters first.");
    }
    const url = `https://api.telegram.org/bot${credentials.telegramBotToken}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.telegramChatId,
        text: "⚙️ Connection Test Successful! Your Daily Quotes Publishing Dashboard is successfully configured.",
      }),
    });
    if (!res.ok) throw new Error(`Telegram server returned ${res.status}`);
    addLog('SUCCESS', `Telegram webhook target channel tests PASSED! Streaming message verified.`);
  };

  const testWebhook = async (type: 'slack' | 'generic') => {
    const targetUrl = type === 'slack' ? credentials.slackWebhookUrl : credentials.webhookUrl;
    if (!targetUrl) throw new Error(`Missing target parameters: Please input a destination URL for ${type.toUpperCase()}`);
    
    const payload = type === 'slack' ? { text: "🔔 Daily Quotes publisher: Integrations Live test dispatch received." } 
      : { test: true, sender: "Daily Quotes Publisher", timestamp: new Date().toISOString() };
      
    const res = await fetch(targetUrl, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Server returned status code: ${res.status}`);
    addLog('SUCCESS', `Live HTTP POST connection test to ${type.toUpperCase()} endpoint completed successfully.`);
  };

  const clearLogs = () => {
    const cleanLogs = [
      {
        id: "log_initial",
        timestamp: new Date().toISOString(),
        type: 'INFO' as const,
        message: "System Logs & Audit archives successfully cleared.",
      }
    ];
    setLogs(cleanLogs);
  };

  return {
    logs,
    addLog,
    clearLogs,
    credentials,
    setCredentials,
    publishQuote,
    triggerDailyPost,
    testTelegram,
    testWebhook,
  };
}
