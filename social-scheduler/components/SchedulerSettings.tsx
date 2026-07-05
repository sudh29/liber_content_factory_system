import React, { useState, useEffect } from 'react';
import { ContentItem, AuditLog } from '../../shared/types';
import { CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface SchedulerSettingsProps {
  quotes: ContentItem[]; // Generalized items
  onScheduleQuote: (quoteId: string, time: string, platforms: string[]) => void;
  onTriggerDailyPost: () => void;
  preSelectedQuoteId?: string | null;
  clearPreSelectedQuoteId?: () => void;
  onPublishNow?: (quoteId: string, platforms: string[]) => void;
  logs?: AuditLog[];
}

const ALL_PLATFORMS = [
  { id: 'twitter', name: 'Twitter / X' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'telegram', name: 'Telegram' },
  { id: 'instagram', name: 'Instagram' },
  { id: 'whatsapp', name: 'WhatsApp' }
];

export const SchedulerSettings: React.FC<SchedulerSettingsProps> = ({
  quotes,
  onScheduleQuote,
  onTriggerDailyPost,
  preSelectedQuoteId,
  clearPreSelectedQuoteId,
  onPublishNow,
  logs,
}) => {
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter', 'linkedin', 'telegram', 'instagram', 'whatsapp']);
  const [publishing, setPublishing] = useState(false);
  const [publishStatus, setPublishStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const unpublishedQuotes = quotes.filter((q) => q.status === 'Unpublished');
  
  // Find current selected quote
  const selectedQuote = quotes.find(q => q.id === selectedQuoteId);

  // Auto-select quote ID when passed from main page
  useEffect(() => {
    if (preSelectedQuoteId) {
      setSelectedQuoteId(preSelectedQuoteId);
    }
  }, [preSelectedQuoteId]);

  const handleTogglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSelectAllPlatforms = () => {
    if (selectedPlatforms.length === ALL_PLATFORMS.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(ALL_PLATFORMS.map(p => p.id));
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId) return;
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one social media channel to publish.");
      return;
    }

    setPublishing(true);
    setPublishStatus(null);

    try {
      if (onPublishNow) {
        await onPublishNow(selectedQuoteId, selectedPlatforms);
      }
      setPublishStatus({
        type: 'success',
        message: 'Publish cycle finished. Review delivery logs below for channel-specific reports.'
      });
      setSelectedQuoteId("");
      if (clearPreSelectedQuoteId) {
        clearPreSelectedQuoteId();
      }
    } catch (err: any) {
      setPublishStatus({
        type: 'error',
        message: err.message || 'Immediate publishing call failed.'
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div id="scheduler-card" className="bg-white dark:bg-brand-navy rounded-2xl shadow-xs border border-brand-gold/20 dark:border-brand-slate/40 p-6 max-w-xl mx-auto space-y-6 transition-colors duration-200">
      <form id="schedule-queue-form" onSubmit={handlePublish} className="p-5 bg-brand-cream/60/50 dark:bg-brand-midnight/40 rounded-xl border border-brand-gold/20 dark:border-brand-slate/40 space-y-5">
        <span className="block text-[10px] font-bold text-brand-slate/80 dark:text-brand-slate uppercase tracking-widest">
          Publish Content Instantly
        </span>

        {/* Status Messages */}
        {publishStatus && (
          <div className={`p-3.5 rounded-xl text-xs border ${
            publishStatus.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-300'
              : 'bg-rose-50 dark:bg-rose-955/20 text-rose-800 dark:text-rose-400 border-rose-300'
          }`}>
            <div className="flex gap-2 items-start">
              {publishStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              )}
              <span>{publishStatus.message}</span>
            </div>
          </div>
        )}

        {preSelectedQuoteId && selectedQuote && (
          <div className="p-3 bg-brand-terracotta/10 border-l-4 border-brand-terracotta rounded-r-xl text-xs space-y-1">
            <span className="font-bold text-brand-navy dark:text-brand-cream flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-terracotta" /> Received From Generation Page:
            </span>
            <p className="text-[11px] italic text-brand-slate dark:text-brand-gold/80 leading-relaxed truncate">
              [{selectedQuote.type}] "{selectedQuote.text}"
            </p>
            <button
              type="button"
              onClick={() => {
                setSelectedQuoteId("");
                if (clearPreSelectedQuoteId) clearPreSelectedQuoteId();
              }}
              className="text-[9px] font-bold text-brand-terracotta hover:underline cursor-pointer"
            >
              Change content selection
            </button>
          </div>
        )}

        {(!preSelectedQuoteId || !selectedQuote) && (
          <div>
            <label className="block text-xs font-medium text-brand-navy/80 dark:text-brand-gold/70 mb-1">Select Unpublished Item</label>
            <select
              id="schedule-quote-selector"
              value={selectedQuoteId}
              onChange={(e) => setSelectedQuoteId(e.target.value)}
              className="w-full text-xs p-2.5 bg-white dark:bg-brand-navy border border-brand-gold/25 dark:border-brand-slate/30 text-brand-navy dark:text-brand-cream rounded-lg focus:outline-none"
              required
              disabled={publishing}
            >
              <option value="" className="text-brand-slate dark:text-brand-slate/80">-- Choose Content --</option>
              {unpublishedQuotes.map((q) => (
                <option key={q.id} value={q.id}>
                  [{q.type}] {q.title ? `"${q.title}"` : `"${q.text.substring(0, 36)}..."`} (— {q.author})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Social Media Target Channels Checkboxes */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-medium text-brand-navy/80 dark:text-brand-gold/70">
            <span>Select Target Platforms</span>
            <button
              type="button"
              onClick={handleSelectAllPlatforms}
              disabled={publishing}
              className="px-2 py-0.5 bg-brand-slate/10 dark:bg-brand-navy border border-brand-gold/20 hover:bg-brand-slate/20 rounded text-[9px] font-bold text-brand-navy dark:text-brand-gold cursor-pointer"
            >
              {selectedPlatforms.length === ALL_PLATFORMS.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-white dark:bg-brand-navy/60 p-3 rounded-xl border border-brand-gold/25 dark:border-brand-slate/30">
            {ALL_PLATFORMS.map((platform) => {
              const isChecked = selectedPlatforms.includes(platform.id);
              return (
                <label key={platform.id} className="flex items-center gap-2 text-xs text-brand-navy/80 dark:text-brand-gold/80 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    disabled={publishing}
                    onChange={() => handleTogglePlatform(platform.id)}
                    className="rounded text-brand-terracotta focus:ring-brand-terracotta border-brand-gold/25"
                  />
                  <span>{platform.name}</span>
                </label>
              );
            })}
          </div>
        </div>

        <button
          id="publish-now-btn"
          type="submit"
          disabled={!selectedQuoteId || publishing}
          className="w-full py-2.5 bg-brand-terracotta hover:bg-brand-terracotta/90 disabled:bg-brand-cream/70 dark:disabled:bg-brand-midnight disabled:text-brand-slate/80 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer select-none flex justify-center items-center gap-2"
        >
          {publishing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Publishing...</span>
            </>
          ) : (
            <span>Publish Now</span>
          )}
        </button>
      </form>

      {/* Logs section embedded directly below the form */}
      {logs && logs.length > 0 && (
        <div className="border-t border-brand-gold/15 dark:border-brand-slate/40 pt-4 space-y-2.5">
          <span className="block text-[10px] font-bold text-brand-slate/80 dark:text-brand-slate uppercase tracking-widest">
            Recent Publishing Activity Logs
          </span>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {logs.slice(0, 5).map((log) => (
              <div
                key={log.id}
                className={`p-2.5 rounded-lg border text-[11px] font-mono leading-normal ${
                  log.type === 'SUCCESS'
                    ? 'bg-brand-terracotta/10 border-emerald-100 dark:bg-brand-navy/20 dark:border-emerald-900/40 text-brand-navy dark:text-brand-cream/90'
                    : log.type === 'ERROR'
                    ? 'bg-brand-terracotta/10 border-rose-100 dark:bg-brand-navy/20 dark:border-rose-900/40 text-brand-navy dark:text-brand-cream/90'
                    : 'bg-brand-slate/10 border-brand-gold/15 dark:bg-brand-navy/20 dark:border-brand-slate/40 text-brand-navy dark:text-brand-cream/90'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[9px] font-sans font-bold">
                  <span className={`uppercase px-1.5 py-0.5 rounded text-[8px] tracking-wide font-black ${
                    log.type === 'SUCCESS'
                      ? 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950/45'
                      : log.type === 'ERROR'
                      ? 'text-rose-700 bg-rose-100 dark:text-rose-400 dark:bg-rose-955/25'
                      : 'text-brand-slate bg-brand-slate/10'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-brand-slate/80 dark:text-brand-slate/60 font-normal">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-[10px] break-words">{log.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
