import React, { useState } from 'react';
import { Quote } from '../../shared/types';
import { useThemeMode } from '../../shared/hooks/useThemeMode';
import { QuoteManager } from './components/QuoteManager';
import { SocialPreview } from './components/SocialPreview';
import { IntegrationSettings } from './components/IntegrationSettings';
import { LogsPanel } from './components/LogsPanel';
import { SchedulerSettings } from './components/SchedulerSettings';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { BookOpen, Network, Calendar, LayoutDashboard, ScrollText, Laptop, Sparkles, Sun, Moon } from 'lucide-react';
import { useQuotes } from './hooks/useQuotes';
import { usePublishingEngine } from './hooks/usePublishingEngine';

interface SocialSchedulerAppProps {
  onNavigateToDailyQuotes: () => void;
}

export function SocialSchedulerApp({ onNavigateToDailyQuotes }: SocialSchedulerAppProps) {
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'library' | 'preview' | 'schedule' | 'integrations' | 'logs'>('dashboard');
  const { isDarkMode, toggleDarkMode } = useThemeMode();

  // Custom Hooks managing state and logic
  const { 
    quotes, 
    setQuotes, 
    addQuote, 
    deleteQuote, 
    scheduleQuote, 
    updateQuoteText 
  } = useQuotes();
  
  const {
    logs,
    addLog,
    clearLogs,
    credentials,
    setCredentials,
    publishQuote,
    triggerDailyPost,
    testTelegram,
    testWebhook,
  } = usePublishingEngine(quotes, setQuotes, (publishedQuote) => {
    if (selectedQuote?.id === publishedQuote.id) {
      setSelectedQuote(publishedQuote);
    }
  });

  const handleAddQuote = (newQuoteData: Omit<Quote, 'id' | 'status'>): boolean => {
    const { success, isDuplicate, quote } = addQuote(newQuoteData);
    if (isDuplicate) {
      addLog('ERROR', `Deduplication Check Failed: Attempted to add duplicate quote from ${newQuoteData.author} which was blocked.`);
      return false;
    }
    if (success && quote) {
      addLog('INFO', `Quote Repository expanded: Added authentic verified quote attributed to ${newQuoteData.author}.`);
      return true;
    }
    return false;
  };

  const handleDeleteQuote = (id: string) => {
    const deletedQuote = deleteQuote(id);
    if (selectedQuote?.id === id) {
      setSelectedQuote(null);
    }
    addLog('INFO', `Quote removed from database index: ${deletedQuote?.author || 'item'}`);
  };

  const handleImportCSV = (importedQuotes: Omit<Quote, 'id' | 'status'>[]) => {
    let added = 0;
    let skippedIdsCount = 0;
    
    importedQuotes.forEach((im) => {
      const { success } = addQuote(im);
      if (success) {
        added++;
      } else {
        skippedIdsCount++;
      }
    });

    if (added > 0) {
      addLog('SUCCESS', `Bulk Importer processed: Chronicled ${added} new unique quotes. Silently filtered out ${skippedIdsCount} duplicate records.`);
    } else {
      addLog('INFO', `Bulk Importer: Checked duplicate filters. All loaded records (${skippedIdsCount}) already exist; skipped redundant additions.`);
    }

    return { added, skippedIdsCount };
  };

  const handleScheduleQuote = (quoteId: string, timeStr: string) => {
    scheduleQuote(quoteId, timeStr);
    addLog('INFO', `Quote scheduled for auto release. Reservation time: ${new Date(timeStr).toLocaleString()}`, quoteId);
  };

  return (
    <div className={isDarkMode ? "dark min-h-screen bg-brand-pine-dark text-brand-pistachio select-text pb-20 transition-colors duration-200" : "min-h-screen bg-brand-pistachio text-brand-earth select-text pb-20 transition-colors duration-200"}>
      {/* Sleek Top Banner Header */}
          <header className="bg-brand-green text-brand-pistachio py-5 px-6 sticky top-0 z-40 shadow-sm border-b border-brand-green/45 dark:bg-brand-pine-dark/95 dark:border-brand-green/20">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-clay rounded-xl">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-pistachio tracking-tight text-lg">Daily Quotes Publisher</span>
                    <span className="text-[9px] font-bold tracking-widest text-brand-pistachio bg-brand-clay/40 border border-brand-clay/35 px-2 py-0.5 rounded-full uppercase">Deduplication Active</span>
                  </div>
                  <p className="text-xs text-brand-sage/90 dark:text-brand-sage/80">Manage, preview & publish authentic historical quotes with zero content duplicates</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 self-stretch md:self-auto select-none">
                {/* Back to public Daily Quotes app */}
                <button
                  id="header-back-home"
                  onClick={onNavigateToDailyQuotes}
                  className="px-3.5 py-1.5 bg-brand-pistachio/15 hover:bg-brand-pistachio/25 rounded-xl text-xs font-semibold text-brand-pistachio transition-all duration-150 flex items-center gap-1.5 border border-brand-sage/20 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-brand-clay animate-pulse" />
                  <span>View Daily Quotes</span>
                </button>

                {/* Quick-stats strip in header */}
                <div className="flex items-center gap-2.5 text-xs">
                  <div className="bg-brand-green/45 px-3 py-1.5 rounded-xl border border-brand-sage/20 font-mono text-[11px] text-[#f4f6f0] dark:bg-brand-pine-dark dark:border-brand-green/45">
                    Queue Reserve: <span className="text-brand-clay font-bold">{quotes.filter((q) => q.status === 'Unpublished').length}</span>
                  </div>
                  <div className="bg-brand-green/45 px-3 py-1.5 rounded-xl border border-brand-sage/20 font-mono text-[11px] text-[#f4f6f0] dark:bg-brand-pine-dark dark:border-brand-green/45">
                    Published: <span className="text-brand-sage font-bold">{quotes.filter((q) => q.status === 'Published').length}</span>
                  </div>
                </div>

                {/* Premium Dark Mode Toggle Switcher */}
                <button
                  id="theme-toggle"
                  onClick={toggleDarkMode}
                  className="p-2 bg-brand-green/70 hover:bg-brand-green/90 dark:bg-brand-pine-dark dark:hover:bg-brand-green/30 text-brand-sage hover:text-brand-pistachio rounded-xl border border-brand-sage/25 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 px-3 min-h-[36px]"
                  title={isDarkMode ? "Activate Light Mode" : "Activate Dark Mode"}
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-4 h-4 text-brand-clay animate-pulse" />
                      <span className="text-[11px] font-medium text-brand-clay hidden sm:inline">Light</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-4 h-4 text-brand-sage" />
                      <span className="text-[11px] font-medium text-brand-sage hidden sm:inline">Dark</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          </header>

          {/* Main Grid containing Tabs Layout */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
            
            {/* Navigation Tabs bar */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-brand-sage/20 dark:border-brand-green/30 pb-4 mb-6 select-none">
              
              <button
                id="nav-tab-dashboard"
                onClick={() => setActiveTab('dashboard')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'dashboard' ? 'bg-brand-green text-brand-pistachio shadow-sm dark:bg-brand-sage dark:text-brand-pine-dark' : 'text-brand-earth/80 hover:text-brand-green hover:bg-brand-sage/10 dark:text-brand-sage/80 dark:hover:text-brand-pistachio dark:hover:bg-brand-green/30'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard & Analytics</span>
              </button>

              <button
                id="nav-tab-library"
                onClick={() => setActiveTab('library')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'library' ? 'bg-brand-green text-brand-pistachio shadow-sm dark:bg-brand-sage dark:text-brand-pine-dark' : 'text-brand-earth/80 hover:text-brand-green hover:bg-brand-sage/10 dark:text-brand-sage/80 dark:hover:text-brand-pistachio dark:hover:bg-brand-green/30'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Quote Repository</span>
              </button>

              <button
                id="nav-tab-preview"
                onClick={() => setActiveTab('preview')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'preview' ? 'bg-brand-green text-brand-pistachio shadow-sm dark:bg-brand-sage dark:text-brand-pine-dark' : 'text-brand-earth/80 hover:text-brand-green hover:bg-brand-sage/10 dark:text-brand-sage/80 dark:hover:text-brand-pistachio dark:hover:bg-brand-green/30'
                }`}
              >
                <Laptop className="w-4 h-4" />
                <span>Social Previewer ({selectedQuote ? "1 Active" : "0 selected"})</span>
              </button>

              <button
                id="nav-tab-schedule"
                onClick={() => setActiveTab('schedule')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'schedule' ? 'bg-brand-green text-brand-pistachio shadow-sm dark:bg-brand-sage dark:text-brand-pine-dark' : 'text-brand-earth/80 hover:text-brand-green hover:bg-brand-sage/10 dark:text-brand-sage/80 dark:hover:text-brand-pistachio dark:hover:bg-brand-green/30'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Daily Posting Engine</span>
              </button>

              <button
                id="nav-tab-integrations"
                onClick={() => setActiveTab('integrations')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'integrations' ? 'bg-brand-green text-brand-pistachio shadow-sm dark:bg-brand-sage dark:text-brand-pine-dark' : 'text-brand-earth/80 hover:text-brand-green hover:bg-brand-sage/10 dark:text-brand-sage/80 dark:hover:text-brand-pistachio dark:hover:bg-brand-green/30'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>Integrations & REST</span>
              </button>

              <button
                id="nav-tab-logs"
                onClick={() => setActiveTab('logs')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'logs' ? 'bg-brand-green text-brand-pistachio shadow-sm dark:bg-brand-sage dark:text-brand-pine-dark' : 'text-brand-earth/80 hover:text-brand-green hover:bg-brand-sage/10 dark:text-brand-sage/80 dark:hover:text-brand-pistachio dark:hover:bg-brand-green/30'
                }`}
              >
                <ScrollText className="w-4 h-4" />
                <span>Publish Audit Logs ({logs.length})</span>
              </button>

            </div>

            {/* Tab Viewport Contents */}
            <div className="space-y-6">
              
              {/* Dashboard tab */}
              {activeTab === 'dashboard' && (
                <div id="view-dashboard-panel" className="space-y-6">
                  <AnalyticsCharts quotes={quotes} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Info Card */}
                    <div className="bg-white dark:bg-[#152418] p-6 rounded-2xl border border-brand-sage/40 dark:border-brand-green/50 shadow-xs space-y-4 transition-colors duration-200">
                      <div className="flex items-center gap-2.5 text-brand-green dark:text-brand-sage">
                        <Sparkles className="w-5 h-5" />
                        <h4 className="font-semibold text-brand-earth dark:text-brand-pistachio text-sm">Anti-AI Plagiarism Guard</h4>
                      </div>
                      <p className="text-xs text-brand-earth/80 dark:text-brand-sage leading-relaxed">
                        This platform enforces a strict <strong>Verified Authentic Policy</strong>. Quotes must be curated from actual literature, speeches, or historic archives containing correct attributions. Synthetic, paraphrased, or AI-generated versions are strictly forbidden. 
                      </p>
                      <p className="text-xs text-brand-earth/80 dark:text-brand-sage leading-relaxed">
                        A multi-point parsing algorithm automatically deduplicates text content on upload or creation. Once a quote is marked "Published", it is permanently locked from re-release.
                      </p>
                      <div className="flex gap-2">
                        <button
                          id="view-library-redirect"
                          onClick={() => setActiveTab('library')}
                          className="px-3 py-1.5 bg-brand-green/10 dark:bg-brand-green/45 text-brand-green dark:text-brand-sage rounded-lg text-xs font-medium hover:bg-brand-green/20 dark:hover:bg-brand-green/60 cursor-pointer transition-colors"
                        >
                          View Quote Archive
                        </button>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div className="bg-white dark:bg-[#152418] p-6 rounded-2xl border border-brand-sage/40 dark:border-brand-green/50 shadow-xs flex flex-col justify-between transition-colors duration-200">
                      <div className="space-y-2">
                        <h4 className="font-semibold text-brand-earth dark:text-brand-pistachio text-sm">Automation System Status</h4>
                        <p className="text-xs text-brand-earth/80 dark:text-brand-sage/90">Live operational monitor tracking active pipelines.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 py-4">
                        <div className="p-3 bg-brand-green/10 text-brand-green dark:text-brand-sage rounded-xl text-center transition-colors">
                          <span className="text-xs font-bold block">ENGINES</span>
                          <span className="text-[10px] text-brand-green font-bold dark:text-brand-sage block mt-0.5">🟢 ACTIVE</span>
                        </div>
                        <div className="p-3 bg-brand-clay/10 text-brand-clay rounded-xl text-center transition-colors">
                          <span className="text-xs font-bold block">INTEGRATIONS</span>
                          <span className="text-[10px] text-brand-clay font-bold block mt-0.5">✔️ READY</span>
                        </div>
                      </div>

                      <div className="text-[11px] text-brand-earth/80 dark:text-brand-sage flex justify-between items-center bg-brand-pistachio/80 dark:bg-brand-pine-dark p-2.5 rounded-lg border border-brand-sage/30 dark:border-brand-green/45 transition-colors">
                        <span>Next scheduled release:</span>
                        <span className="font-mono font-medium text-brand-green dark:text-brand-sage">Tomorrow at 09:00 AM</span>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Library management tab */}
              {activeTab === 'library' && (
                <div id="view-library-panel">
                  <QuoteManager
                    quotes={quotes}
                    onAddQuote={handleAddQuote}
                    onDeleteQuote={handleDeleteQuote}
                    selectedQuoteId={selectedQuote?.id}
                    onSelectQuoteToPreview={(q) => {
                      setSelectedQuote(q);
                      setActiveTab('preview');
                    }}
                    onImportCSV={handleImportCSV}
                    onForcePublish={publishQuote}
                  />
                </div>
              )}

              {/* Visual card simulator designer tab */}
              {activeTab === 'preview' && (
                <div id="view-preview-panel">
                  <SocialPreview
                    quote={selectedQuote}
                    onEditQuoteText={(id, txt) => {
                      updateQuoteText(id, txt);
                      addLog('INFO', "Quote text updated in-memory via preview designer.", id);
                    }}
                  />
                </div>
              )}

              {/* Posting slots scheduler tab */}
              {activeTab === 'schedule' && (
                <div id="view-schedule-panel">
                  <SchedulerSettings
                    quotes={quotes}
                    onScheduleQuote={handleScheduleQuote}
                    onTriggerDailyPost={triggerDailyPost}
                  />
                </div>
              )}

              {/* Connections creds webhooks tab */}
              {activeTab === 'integrations' && (
                <div id="view-integrations-panel">
                  <IntegrationSettings
                    credentials={credentials}
                    onChange={setCredentials}
                    onTestTelegram={testTelegram}
                    onTestWebhook={testWebhook}
                  />
                </div>
              )}

              {/* Audit lists log tab */}
              {activeTab === 'logs' && (
                <div id="view-logs-panel">
                  <LogsPanel
                    logs={logs}
                    quotes={quotes}
                    onClearLogs={clearLogs}
                    onRetryPublish={publishQuote}
                  />
                </div>
              )}

            </div>

          </main>
    </div>
  );
}
