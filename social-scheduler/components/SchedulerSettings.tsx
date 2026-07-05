import React, { useState, useEffect } from 'react';
import { ContentItem } from '../../shared/types';
import { Calendar, Clock, ToggleLeft, ToggleRight, Play, CheckCircle2 } from 'lucide-react';

interface SchedulerSettingsProps {
  quotes: ContentItem[]; // Generalized items
  onScheduleQuote: (quoteId: string, time: string, platforms: string[]) => void;
  onTriggerDailyPost: () => void;
  preSelectedQuoteId?: string | null;
  clearPreSelectedQuoteId?: () => void;
  onPublishNow?: (quoteId: string) => void;
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
}) => {
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['twitter', 'linkedin', 'telegram', 'instagram', 'whatsapp']);
  const [autoPosting, setAutoPosting] = useState(true);

  const unpublishedQuotes = quotes.filter((q) => q.status === 'Unpublished');
  const scheduledQuotes = quotes.filter((q) => q.status === 'Scheduled');
  
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

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId) return;
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one social media channel to schedule publishing.");
      return;
    }

    const today = new Date();
    const [hours, minutes] = scheduleTime.split(":");
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (today < new Date()) {
      today.setDate(today.getDate() + 1);
    }

    onScheduleQuote(selectedQuoteId, today.toISOString(), selectedPlatforms);
    setSelectedQuoteId("");
    if (clearPreSelectedQuoteId) {
      clearPreSelectedQuoteId();
    }
  };

  return (
    <div id="scheduler-card" className="bg-white dark:bg-brand-navy rounded-2xl shadow-xs border border-brand-gold/20 dark:border-brand-slate/40 p-6 space-y-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6 border-b border-brand-gold/15 dark:border-brand-slate/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-gold/15 dark:bg-brand-navy/40 text-brand-gold dark:text-brand-gold rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy dark:text-brand-cream text-lg">Scheduled Publishing Engine</h3>
            <p className="text-xs text-brand-slate dark:text-brand-slate/80 mt-0.5">Automate and queue up daily publication slots for different content types.</p>
          </div>
        </div>

        <button
          id="toggle-automated-posting-btn"
          onClick={() => setAutoPosting(!autoPosting)}
          className="flex items-center gap-1 cursor-pointer select-none"
        >
          {autoPosting ? (
            <ToggleRight className="w-9 h-9 text-brand-terracotta" />
          ) : (
            <ToggleLeft className="w-9 h-9 text-brand-slate/80 dark:text-brand-slate" />
          )}
          <span className="text-xs font-semibold text-brand-navy/80 dark:text-brand-gold/70">Auto Publish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Create Scheduler queue slot */}
        <div className="lg:col-span-5 space-y-4">
          <form id="schedule-queue-form" onSubmit={handleCreateSchedule} className="p-4 bg-brand-cream/60/50 dark:bg-brand-midnight/40 rounded-xl border border-brand-gold/20 dark:border-brand-slate/40 space-y-4">
            <span className="block text-[10px] font-bold text-brand-slate/80 dark:text-brand-slate uppercase tracking-widest">
              Schedule Content Queue Slot
            </span>

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
                        onChange={() => handleTogglePlatform(platform.id)}
                        className="rounded text-brand-terracotta focus:ring-brand-terracotta border-brand-gold/25"
                      />
                      <span>{platform.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-navy/80 dark:text-brand-gold/70 mb-1">Time Slot</label>
                <input
                  id="schedule-time-slot"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-brand-navy border border-brand-gold/25 dark:border-brand-slate/30 text-brand-navy dark:text-brand-cream rounded-lg focus:outline-none"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  id="add-to-schedule-btn"
                  type="submit"
                  disabled={!selectedQuoteId}
                  className="w-full py-2 bg-brand-slate hover:bg-brand-slate disabled:bg-brand-cream/70 dark:disabled:bg-brand-midnight disabled:text-brand-slate/80 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer select-none"
                >
                  Confirm Slot
                </button>
              </div>
            </div>
          </form>

          {/* Instant Publish Trigger */}
          <div className="p-4 bg-brand-terracotta/10/50 dark:bg-brand-navy/20 border border-emerald-100/50 dark:border-emerald-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-navy dark:text-brand-terracotta/70 uppercase tracking-wide">Instant Publisher Sim</span>
              <span className="bg-brand-terracotta/15 dark:bg-brand-navy/60 text-brand-terracotta dark:text-brand-terracotta/80 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">Trigger Event</span>
            </div>
            <p className="text-xs text-brand-terracotta dark:text-brand-terracotta leading-normal">
              Trigger instant publication of the next ready content item in the queue to verify REST and webhook integrations immediately.
            </p>
            <button
              id="instant-scheduled-daily-trigger-btn"
              onClick={onTriggerDailyPost}
              disabled={unpublishedQuotes.length === 0}
              className="w-full py-2 bg-brand-terracotta hover:bg-brand-terracotta/80 disabled:bg-brand-cream dark:disabled:bg-brand-midnight disabled:text-white dark:disabled:text-brand-slate text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Trigger Next In-Line
            </button>
          </div>
        </div>

        {/* Right Side: Active Scheduled Queue */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-brand-slate dark:text-brand-slate/80 uppercase tracking-wider">
            <span>Upcoming Queue ({scheduledQuotes.length})</span>
            <span className="text-[10px] text-brand-slate dark:text-brand-gold font-semibold lowercase">FIFO execution order</span>
          </div>

          {scheduledQuotes.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-brand-gold/20 dark:border-brand-slate/40 rounded-xl bg-brand-cream/60/10 dark:bg-brand-midnight/20">
              <Clock className="w-8 h-8 text-brand-gold/60 dark:text-brand-slate mx-auto mb-1" />
              <p className="text-xs text-brand-slate/80 dark:text-brand-slate">No scheduled content in queue.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {scheduledQuotes.map((q) => {
                const dateStr = q.scheduledTime ? new Date(q.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                const platformsStr = q.scheduledPlatforms ? q.scheduledPlatforms.join(', ') : "all channels";
                return (
                  <div key={q.id} id={`scheduled-item-${q.id}`} className="bg-white dark:bg-brand-midnight/50 p-3 rounded-xl border border-brand-gold/20 dark:border-brand-slate/40 hover:border-brand-gold/25 dark:hover:border-brand-slate/30 transition-all flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-brand-slate/10 dark:bg-brand-navy/50 text-brand-slate dark:text-brand-gold rounded-lg shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-navy dark:text-brand-cream truncate">
                          [{q.type}] {q.title ? `"${q.title}"` : `"${q.text}"`}
                        </p>
                        <p className="text-[10px] text-brand-slate dark:text-brand-slate/80 mt-0.5">Author: {q.author}</p>
                        <p className="text-[9px] text-brand-terracotta dark:text-brand-gold/60 mt-1 font-mono uppercase tracking-wider font-semibold">Targets: {platformsStr}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] bg-brand-cream dark:bg-brand-midnight font-semibold px-2 py-1 rounded text-brand-navy dark:text-brand-cream/90">
                        {dateStr || "9:00 AM"}
                      </span>
                      <button
                        onClick={() => onPublishNow && onPublishNow(q.id)}
                        className="px-2 py-1 bg-brand-terracotta hover:bg-brand-terracotta/90 text-brand-cream rounded text-[10px] font-bold cursor-pointer select-none transition-all"
                      >
                        Publish Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
