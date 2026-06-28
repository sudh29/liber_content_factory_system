import React, { useState } from 'react';
import { Network, Bot, Webhook, ShieldAlert, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { IntegrationCredentials } from '../../../shared/types';

interface IntegrationSettingsProps {
  credentials: IntegrationCredentials;
  onChange: (credentials: IntegrationCredentials) => void;
  onTestTelegram: () => Promise<void>;
  onTestWebhook: (type: 'slack' | 'generic') => Promise<void>;
}

export const IntegrationSettings: React.FC<IntegrationSettingsProps> = ({
  credentials,
  onChange,
  onTestTelegram,
  onTestWebhook,
}) => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const handleUpdate = (field: keyof IntegrationCredentials, value: any) => {
    onChange({
      ...credentials,
      [field]: value,
    });
  };

  const handleMockUpdate = (field: keyof IntegrationCredentials['mockSettings'], value: boolean) => {
    onChange({
      ...credentials,
      mockSettings: {
        ...credentials.mockSettings,
        [field]: value,
      },
    });
  };

  const runTest = async (type: 'telegram' | 'slack' | 'generic', testFn: () => Promise<void>) => {
    setTesting(type);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      await testFn();
      setSuccessMsg(`Connection test to ${type.toUpperCase()} completed successfully! Check your channel or logs.`);
    } catch (err: any) {
      setErrorMsg(`Test failed: ${err.message || err}`);
    } finally {
      setTesting(null);
    }
  };

  return (
    <div id="integration-settings-card" className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6 border-b border-gray-50 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-450 rounded-xl">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Social Integrations & REST APIs</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Configure endpoints to enable real or simulated publishing events</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Telegram Section */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium text-gray-950 dark:text-white text-sm">Telegram Bot Integration (Real API)</span>
            </div>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-805 dark:text-emerald-300 px-2 py-0.5 rounded-full font-medium">Supports Live Sends</span>
          </div>

          <p className="text-xs text-gray-600 dark:text-slate-350 leading-relaxed">
            Specify a Telegram Bot Token and Chat ID (or channel ID e.g., <code className="bg-white dark:bg-slate-900 px-1 py-0.5 rounded border dark:border-slate-800">@mychannel</code>) to trigger actual message posts using the native Telegram Bot API!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Bot API Token</label>
              <input
                id="telegram-bot-token-input"
                type="password"
                placeholder="123456789:ABCDefGhIjKlMnOpQr..."
                value={credentials.telegramBotToken}
                onChange={(e) => handleUpdate('telegramBotToken', e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-300 mb-1">Chat ID or Channel Username</label>
              <input
                id="telegram-chat-id-input"
                type="text"
                placeholder="-1000123456 or @mychannel"
                value={credentials.telegramChatId}
                onChange={(e) => handleUpdate('telegramChatId', e.target.value)}
                className="w-full text-xs font-mono px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              id="test-telegram-btn"
              type="button"
              disabled={!credentials.telegramBotToken || !credentials.telegramChatId || testing !== null}
              onClick={() => runTest('telegram', onTestTelegram)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 dark:disabled:bg-slate-800 text-white disabled:text-gray-400 dark:disabled:text-slate-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              {testing === 'telegram' ? 'Testing Connection...' : 'Test Send Telegram Message'}
            </button>
          </div>
        </div>

        {/* Slack and General Webhook Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Slack Webhook */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-orange-500" />
              <span className="font-medium text-gray-950 dark:text-white text-sm">Slack Webhook URL</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-350">
              Sends an authentic rich slack block layout representing the daily quote to a channel Slack webhook address.
            </p>
            <input
              id="slack-webhook-input"
              type="password"
              placeholder="https://hooks.slack.com/services/..."
              value={credentials.slackWebhookUrl}
              onChange={(e) => handleUpdate('slackWebhookUrl', e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <button
                id="test-slack-btn"
                type="button"
                disabled={!credentials.slackWebhookUrl || testing !== null}
                onClick={() => runTest('slack', () => onTestWebhook('slack'))}
                className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-200 dark:disabled:bg-slate-800 text-white disabled:text-gray-400 dark:disabled:text-slate-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                {testing === 'slack' ? 'Posting...' : 'Test Slack'}
              </button>
            </div>
          </div>

          {/* Custom REST Webhook */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2">
              <Webhook className="w-5 h-5 text-emerald-600 dark:text-emerald-450" />
              <span className="font-medium text-gray-950 dark:text-white text-sm">Generic REST Webhook</span>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-350">
              Dispatches an HTTP POST request containing raw JSON data of the quote (text, author, source, categories).
            </p>
            <input
              id="generic-webhook-input"
              type="text"
              placeholder="https://api.myplatform.com/v1/quotes"
              value={credentials.webhookUrl}
              onChange={(e) => handleUpdate('webhookUrl', e.target.value)}
              className="w-full text-xs font-mono px-3 py-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex justify-end">
              <button
                id="test-generic-webhook-btn"
                type="button"
                disabled={!credentials.webhookUrl || testing !== null}
                onClick={() => runTest('generic', () => onTestWebhook('generic'))}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-slate-800 text-white disabled:text-gray-400 dark:disabled:text-slate-600 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                {testing === 'generic' ? 'Posting...' : 'Test Webhook'}
              </button>
            </div>
          </div>
        </div>

        {/* Simulation / Override Settings */}
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/40 space-y-3 transition-colors duration-200">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <ShieldAlert className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Simulation and Retry Engine Config</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="simulate-failures-checkbox"
                type="checkbox"
                checked={credentials.mockSettings.simulateFailures}
                onChange={(e) => handleMockUpdate('simulateFailures', e.target.checked)}
                className="mt-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-sm"
              />
              <div>
                <span className="text-xs font-medium text-gray-950 dark:text-white block">Simulate Random Posting Failures</span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 block">Simulates intermittent network dropouts to evaluate retry handles & warning logs.</span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                id="auto-track-engagement-checkbox"
                type="checkbox"
                checked={credentials.mockSettings.autoTrackEngagement}
                onChange={(e) => handleMockUpdate('autoTrackEngagement', e.target.checked)}
                className="mt-1 h-3.5 w-3.5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded-sm"
              />
              <div>
                <span className="text-xs font-medium text-gray-950 dark:text-white block">Simulate Dynamic Social Engagement</span>
                <span className="text-[10px] text-gray-500 dark:text-slate-400 block">Gradually accumulates mock impressions, likes, and shares for published quotes.</span>
              </div>
            </label>
          </div>
        </div>

        {successMsg && (
          <div id="test-success-message" className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-l-4 border-emerald-500 rounded-r-lg text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div id="test-error-message" className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-l-4 border-rose-500 rounded-r-lg text-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
