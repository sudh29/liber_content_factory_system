import React, { useState } from 'react';
import { ContentItem } from '../../../shared/types';
import { Calendar, Clock, ToggleLeft, ToggleRight, Play } from 'lucide-react';

interface SchedulerSettingsProps {
  quotes: ContentItem[]; // Generalized items
  onScheduleQuote: (quoteId: string, time: string) => void;
  onTriggerDailyPost: () => void;
}

export const SchedulerSettings: React.FC<SchedulerSettingsProps> = ({
  quotes,
  onScheduleQuote,
  onTriggerDailyPost,
}) => {
  const [scheduleTime, setScheduleTime] = useState("09:00");
  const [selectedQuoteId, setSelectedQuoteId] = useState("");
  const [autoPosting, setAutoPosting] = useState(true);

  const unpublishedQuotes = quotes.filter((q) => q.status === 'Unpublished');
  const scheduledQuotes = quotes.filter((q) => q.status === 'Scheduled');

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedQuoteId) return;

    const today = new Date();
    const [hours, minutes] = scheduleTime.split(":");
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (today < new Date()) {
      today.setDate(today.getDate() + 1);
    }

    onScheduleQuote(selectedQuoteId, today.toISOString());
    setSelectedQuoteId("");
  };

  return (
    <div id="scheduler-card" className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 p-6 space-y-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6 border-b border-gray-50 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Scheduled Publishing Engine</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Automate and queue up daily publication slots for different content types.</p>
          </div>
        </div>

        <button
          id="toggle-automated-posting-btn"
          onClick={() => setAutoPosting(!autoPosting)}
          className="flex items-center gap-1 cursor-pointer select-none"
        >
          {autoPosting ? (
            <ToggleRight className="w-9 h-9 text-emerald-600" />
          ) : (
            <ToggleLeft className="w-9 h-9 text-gray-400 dark:text-slate-650" />
          )}
          <span className="text-xs font-semibold text-gray-700 dark:text-slate-350">Auto Publish</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Create Scheduler queue slot */}
        <div className="lg:col-span-5 space-y-4">
          <form id="schedule-queue-form" onSubmit={handleCreateSchedule} className="p-4 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-gray-100 dark:border-slate-800 space-y-3">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              Schedule Content Queue Slot
            </span>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-slate-350 mb-1">Select Unpublished Item</label>
              <select
                id="schedule-quote-selector"
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none"
                required
              >
                <option value="" className="text-gray-500 dark:text-slate-400">-- Choose Content --</option>
                {unpublishedQuotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    [{q.type}] {q.title ? `"${q.title}"` : `"${q.text.substring(0, 36)}..."`} (— {q.author})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-slate-350 mb-1">Time Slot</label>
                <input
                  id="schedule-time-slot"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-full text-xs p-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white rounded-lg focus:outline-none"
                />
              </div>
              
              <div className="flex items-end">
                <button
                  id="add-to-schedule-btn"
                  type="submit"
                  disabled={!selectedQuoteId}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-150 dark:disabled:bg-slate-805 disabled:text-gray-400 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer select-none"
                >
                  Confirm Slot
                </button>
              </div>
            </div>
          </form>

          {/* Instant Publish Trigger */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-250 uppercase tracking-wide">Instant Publisher Sim</span>
              <span className="bg-emerald-150 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase">Trigger Event</span>
            </div>
            <p className="text-xs text-emerald-800 dark:text-emerald-355 leading-normal">
              Trigger instant publication of the next ready content item in the queue to verify REST and webhook integrations immediately.
            </p>
            <button
              id="instant-scheduled-daily-trigger-btn"
              onClick={onTriggerDailyPost}
              disabled={unpublishedQuotes.length === 0}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 dark:disabled:bg-slate-800 disabled:text-white dark:disabled:text-slate-600 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all select-none cursor-pointer shadow-xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Trigger Next In-Line
            </button>
          </div>
        </div>

        {/* Right Side: Active Scheduled Queue */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
            <span>Upcoming Queue ({scheduledQuotes.length})</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold lowercase">FIFO execution order</span>
          </div>

          {scheduledQuotes.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-gray-150 dark:border-slate-800 rounded-xl bg-slate-50/10 dark:bg-slate-950/20">
              <Clock className="w-8 h-8 text-gray-300 dark:text-slate-650 mx-auto mb-1" />
              <p className="text-xs text-gray-400 dark:text-slate-500">No scheduled content in queue.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {scheduledQuotes.map((q) => {
                const dateStr = q.scheduledTime ? new Date(q.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
                return (
                  <div key={q.id} id={`scheduled-item-${q.id}`} className="bg-white dark:bg-slate-950/50 p-3 rounded-xl border border-gray-100 dark:border-slate-850 hover:border-gray-200 dark:hover:border-slate-700 transition-all flex items-center justify-between text-xs gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          [{q.type}] {q.title ? `"${q.title}"` : `"${q.text}"`}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">Author: {q.author}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 font-semibold px-2 py-1 rounded text-slate-800 dark:text-slate-200">
                        {dateStr || "9:00 AM"}
                      </span>
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
