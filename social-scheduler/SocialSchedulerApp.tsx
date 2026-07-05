import React, { useState } from 'react';
import { ContentItem } from '../shared/types';
import { useThemeMode } from '../shared/hooks/useThemeMode';
import { SocialPreview } from './components/SocialPreview';
import { IntegrationSettings } from './components/IntegrationSettings';
import { LogsPanel } from './components/LogsPanel';
import { SchedulerSettings } from './components/SchedulerSettings';
import { AnalyticsCharts } from './components/AnalyticsCharts';
import { ContentGeneration } from './components/ContentGeneration';
import { BookOpen, Network, Calendar, LayoutDashboard, ScrollText, Sparkles, Sun, Moon, Plus, Eye, BarChart3, Settings, ShieldAlert, X } from 'lucide-react';
import { useQuotes } from './hooks/useQuotes';
import { usePublishingEngine } from './hooks/usePublishingEngine';

interface SocialSchedulerAppProps {
  onNavigateToDailyQuotes: () => void;
}

export function SocialSchedulerApp({ onNavigateToDailyQuotes }: SocialSchedulerAppProps) {
  const [selectedQuote, setSelectedQuote] = useState<ContentItem | null>(null);
  const [preSelectedQuoteId, setPreSelectedQuoteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'publishing' | 'analytics'>('generate');
  const [publishingSubTab, setPublishingSubTab] = useState<'queue' | 'connections' | 'logs'>('queue');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
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

  const handleAddQuote = (newQuoteData: Omit<ContentItem, 'id' | 'status'>): boolean => {
    const { success, isDuplicate, quote } = addQuote(newQuoteData);
    if (isDuplicate) {
      addLog('ERROR', `Deduplication Failed: Attempted to add duplicate content from ${newQuoteData.author} which was blocked.`);
      return false;
    }
    if (success && quote) {
      addLog('INFO', `Content expanded: Added new ${newQuoteData.type} record attributed to ${newQuoteData.author}.`);
      setPreSelectedQuoteId(quote.id);
      return true;
    }
    return false;
  };

  const handleDeleteQuote = (id: string) => {
    const deletedQuote = deleteQuote(id);
    if (selectedQuote?.id === id) {
      setSelectedQuote(null);
    }
    addLog('INFO', `Content removed from database index: ${deletedQuote?.author || 'item'}`);
  };

  const handleImportCSV = (importedQuotes: Omit<ContentItem, 'id' | 'status'>[]) => {
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
      addLog('SUCCESS', `Bulk Importer processed: Chronicled ${added} new unique items. Filtered out ${skippedIdsCount} duplicate records.`);
    } else {
      addLog('INFO', `Bulk Importer: Checked duplicate filters. All loaded records (${skippedIdsCount}) already exist; skipped redundant additions.`);
    }

    return { added, skippedIdsCount };
  };

  const handleScheduleQuote = (quoteId: string, timeStr: string, platforms: string[]) => {
    scheduleQuote(quoteId, timeStr, platforms);
    addLog('INFO', `Content scheduled for release to [${platforms.join(', ')}]. Reservation time: ${new Date(timeStr).toLocaleString()}`, quoteId);
  };

  // Tab styling helper
  const tabClass = (tabName: 'generate' | 'publishing' | 'analytics') => {
    const isActive = activeTab === tabName;
    return `py-3 px-5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer select-none ${
      isActive
        ? 'bg-brand-terracotta text-brand-cream shadow-md dark:bg-brand-terracotta dark:text-brand-cream'
        : 'text-brand-navy/70 hover:text-brand-terracotta hover:bg-brand-terracotta/10 dark:text-brand-gold/80 dark:hover:text-brand-terracotta dark:hover:bg-brand-terracotta/15'
    }`;
  };

  const subTabClass = (subTabName: 'queue' | 'connections' | 'logs') => {
    const isActive = publishingSubTab === subTabName;
    return `py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
      isActive
        ? 'bg-brand-slate text-white dark:bg-brand-gold dark:text-brand-midnight shadow-sm'
        : 'text-brand-slate dark:text-brand-gold/70 hover:bg-brand-cream/80 dark:hover:bg-brand-midnight/60'
    }`;
  };

  return (
    <div className={isDarkMode ? "dark min-h-screen bg-brand-midnight text-brand-cream select-text pb-20 transition-colors duration-200" : "min-h-screen bg-brand-cream text-brand-navy select-text pb-20 transition-colors duration-200"}>
      {/* Sleek Top Banner Header */}
      <header className="bg-brand-navy text-brand-cream py-5 px-6 sticky top-0 z-40 shadow-lg border-b border-brand-slate/30 dark:bg-brand-midnight/95 dark:border-brand-slate/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-terracotta rounded-xl vintage-glow">
              <Sparkles className="w-5 h-5 text-brand-cream" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-cream tracking-tight text-lg font-display">Liber AI Content Factory Hub</span>
              </div>
              <p className="text-xs text-brand-gold/80 dark:text-brand-gold/70">Generate, schedule & analyze AI-powered multi-platform posts seamlessly</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 self-stretch md:self-auto select-none">
            {/* Quick-stats strip in header */}
            <div className="flex items-center gap-2.5 text-xs">
              <div className="bg-brand-slate/40 px-3 py-1.5 rounded-xl border border-brand-gold/15 font-mono text-[11px] text-brand-cream dark:bg-brand-midnight dark:border-brand-slate/40">
                Queue: <span className="text-brand-terracotta font-bold">{quotes.filter((q) => q.status === 'Unpublished').length}</span>
              </div>
              <div className="bg-brand-slate/40 px-3 py-1.5 rounded-xl border border-brand-gold/15 font-mono text-[11px] text-brand-cream dark:bg-brand-midnight dark:border-brand-slate/40">
                Published: <span className="text-brand-gold font-bold">{quotes.filter((q) => q.status === 'Published').length}</span>
              </div>
            </div>

            {/* Premium Dark Mode Toggle Switcher */}
            <button
              id="theme-toggle"
              onClick={toggleDarkMode}
              className="p-2 bg-brand-slate/50 hover:bg-brand-slate/70 dark:bg-brand-midnight dark:hover:bg-brand-slate/30 text-brand-gold hover:text-brand-cream rounded-xl border border-brand-gold/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 px-3 min-h-[36px]"
              title={isDarkMode ? "Activate Light Mode" : "Activate Dark Mode"}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-4 h-4 text-brand-terracotta animate-pulse" />
                  <span className="text-[11px] font-medium text-brand-terracotta hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-brand-gold" />
                  <span className="text-[11px] font-medium text-brand-gold hidden sm:inline">Dark</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* Main Grid containing Tabs Layout */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        
        {/* Navigation Tabs bar - Three Main Pages */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-brand-gold/20 dark:border-brand-slate/30 pb-4 mb-6 select-none">
          
          <button id="nav-tab-generate" onClick={() => setActiveTab('generate')} className={tabClass('generate')}>
            <Sparkles className="w-4 h-4" />
            <span>Content Generation</span>
          </button>

          <button id="nav-tab-publishing" onClick={() => setActiveTab('publishing')} className={tabClass('publishing')}>
            <Calendar className="w-4 h-4" />
            <span>Publishing & Scheduling</span>
          </button>

          <button id="nav-tab-analytics" onClick={() => setActiveTab('analytics')} className={tabClass('analytics')}>
            <LayoutDashboard className="w-4 h-4" />
            <span>Analytics Dashboard</span>
          </button>

        </div>

        {/* Tab Viewport Contents */}
        <div className="space-y-6">
          
          {/* Content Generation Tab (Home) */}
          {activeTab === 'generate' && (
            <ContentGeneration
              onAddQuote={handleAddQuote}
              onNavigateToTab={(tab) => {
                if (tab === 'schedule') {
                  setActiveTab('publishing');
                  setPublishingSubTab('queue');
                } else if (tab === 'dashboard') {
                  setActiveTab('analytics');
                } else if (tab === 'integrations') {
                  setActiveTab('publishing');
                  setPublishingSubTab('connections');
                } else if (tab === 'logs') {
                  setActiveTab('publishing');
                  setPublishingSubTab('logs');
                }
              }}
              setSelectedQuote={setSelectedQuote}
            />
          )}

          {/* Publishing & Scheduling Tab */}
          {activeTab === 'publishing' && (
            <div className="space-y-6">
              
              {/* Publishing sub-tabs */}
              <div className="flex items-center gap-2 bg-brand-cream/60 dark:bg-brand-midnight/40 p-1.5 rounded-xl border border-brand-gold/20 dark:border-brand-slate/40 w-fit select-none">
                <button id="publishing-subtab-queue" onClick={() => setPublishingSubTab('queue')} className={subTabClass('queue')}>
                  Queue & Slots Scheduler
                </button>
                <button id="publishing-subtab-connections" onClick={() => setPublishingSubTab('connections')} className={subTabClass('connections')}>
                  Social Integrations ({Object.values(credentials).filter(c => c && typeof c === 'string').length} Active)
                </button>
                <button id="publishing-subtab-logs" onClick={() => setPublishingSubTab('logs')} className={subTabClass('logs')}>
                  Queue Publish Logs ({logs.length})
                </button>
              </div>

              {publishingSubTab === 'queue' && (
                <div className="max-w-6xl mx-auto space-y-6">
                  <SchedulerSettings
                    quotes={quotes}
                    onScheduleQuote={handleScheduleQuote}
                    onTriggerDailyPost={triggerDailyPost}
                    preSelectedQuoteId={preSelectedQuoteId}
                    clearPreSelectedQuoteId={() => setPreSelectedQuoteId(null)}
                    onPublishNow={publishQuote}
                  />
                </div>
              )}

              {publishingSubTab === 'connections' && (
                <div className="max-w-3xl mx-auto">
                  <IntegrationSettings
                    credentials={credentials}
                    onChange={setCredentials}
                    onTestTelegram={testTelegram}
                    onTestWebhook={testWebhook}
                  />
                </div>
              )}

              {publishingSubTab === 'logs' && (
                <div className="max-w-4xl mx-auto">
                  <LogsPanel
                    logs={logs}
                    quotes={quotes}
                    onClearLogs={clearLogs}
                    onRetryPublish={publishQuote}
                  />
                </div>
              )}

            </div>
          )}

          {/* Analytics Dashboard Tab */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <AnalyticsCharts quotes={quotes} />
            </div>
          )}

        </div>

      </main>

      {/* Floating Preview Modal */}
      {isPreviewModalOpen && selectedQuote && (
        <div className="fixed inset-0 bg-brand-midnight/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn select-text">
          <div className="bg-white dark:bg-brand-navy rounded-3xl border border-brand-gold/30 dark:border-brand-slate/40 shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative p-6">
            
            {/* Close Button */}
            <button
              onClick={() => setIsPreviewModalOpen(false)}
              className="absolute top-4 right-4 p-2 bg-brand-cream hover:bg-brand-cream/80 dark:bg-brand-midnight dark:hover:bg-brand-midnight/80 rounded-full text-brand-slate dark:text-brand-gold cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="mt-2 space-y-4">
              <SocialPreview
                quote={selectedQuote}
                onEditQuoteText={(id, txt) => {
                  updateQuoteText(id, txt);
                  addLog('INFO', "Content text updated in-memory via preview designer.", id);
                }}
              />
              
              <div className="flex justify-end gap-2 pt-2 border-t border-brand-gold/15">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-5 py-2 bg-brand-slate hover:bg-brand-slate/90 text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
