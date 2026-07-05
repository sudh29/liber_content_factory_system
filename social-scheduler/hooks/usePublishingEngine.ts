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

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json() as AuditLog[];
        setLogsState(data);
        localStorage.setItem('quotes_audit_logs', JSON.stringify(data));
      } else {
        throw new Error("Logs failed");
      }
    } catch (e) {
      console.warn("Backend API logs offline/error. Using localStorage cache.");
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
      } catch (err) {
        console.error("Local storage load error", err);
      }
    }
  };

  const fetchCredentials = async () => {
    try {
      const res = await fetch('/api/credentials');
      if (res.ok) {
        const data = await res.json() as IntegrationCredentials;
        setCredentialsState(data);
        localStorage.setItem('quotes_api_credentials', JSON.stringify(data));
      } else {
        throw new Error("Creds failed");
      }
    } catch (e) {
      console.warn("Backend API credentials offline/error. Using localStorage cache.");
      try {
        const storedCreds = localStorage.getItem('quotes_api_credentials');
        if (storedCreds) {
          setCredentialsState(JSON.parse(storedCreds));
        }
      } catch (err) {
        console.error("Local storage load error", err);
      }
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchCredentials();
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
    
    // Save to backend server
    fetch('/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCreds)
    }).catch(err => console.error("Failed to save credentials to backend:", err));
  };

  const publishQuote = async (quoteId: string, targetPlatforms?: string[]) => {
    const quoteToPublish = quotes.find((q) => q.id === quoteId);
    if (!quoteToPublish) {
      addLog('ERROR', "Publication aborted: Specified quote file could not be fetched from index cache.");
      return;
    }

    const platforms = targetPlatforms || quoteToPublish.scheduledPlatforms || ['twitter', 'linkedin', 'telegram', 'instagram', 'whatsapp'];

    // Temporary logs state update for immediate feedback
    const startMsg = `Starting simultaneous publication cycle for platforms: ${platforms.join(', ')}...`;
    const tempStartLog: AuditLog = {
      id: `log_temp_${Date.now()}`,
      timestamp: new Date().toISOString(),
      type: 'INFO',
      message: startMsg,
      quoteId
    };
    setLogsState(prev => [tempStartLog, ...prev]);

    try {
      const res = await fetch('/api/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId, platforms })
      });

      if (!res.ok) {
        throw new Error(await res.text() || "Publish failed");
      }

      const result = await res.json();
      
      // Update local state with quotes and logs from response
      if (result.success && result.quote) {
        const updatedQuote = result.quote;
        const updatedQuotes = quotes.map(q => q.id === quoteId ? updatedQuote : q);
        setQuotes(updatedQuotes);
        
        if (result.logs) {
          setLogsState(result.logs);
          localStorage.setItem('quotes_audit_logs', JSON.stringify(result.logs));
        }

        if (onQuotePublished) {
          onQuotePublished(updatedQuote);
        }
      }
    } catch (err: any) {
      console.error("Failed to publish quote:", err);
      
      // Local fallback in case server fails
      const failLog: AuditLog = {
        id: `log_fail_${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'ERROR',
        message: `Publish failed: ${err.message}`,
        quoteId
      };
      setLogsState(prev => [failLog, ...prev]);
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
    fetch('/api/logs/clear', { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        setLogsState(data);
        localStorage.setItem('quotes_audit_logs', JSON.stringify(data));
      })
      .catch(err => {
        console.error("Failed to clear logs on backend:", err);
        const clean = [{
          id: "log_initial",
          timestamp: new Date().toISOString(),
          type: 'INFO' as const,
          message: "System Logs & Audit archives successfully cleared.",
        }];
        setLogsState(clean);
        localStorage.setItem('quotes_audit_logs', JSON.stringify(clean));
      });
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
