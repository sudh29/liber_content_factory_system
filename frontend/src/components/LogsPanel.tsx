import React from 'react';
import { AuditLog, Quote } from '../types';
import { RefreshCcw, ScrollText, AlertTriangle, CheckCircle, Info, Clock, AlertOctagon } from 'lucide-react';

interface LogsPanelProps {
  logs: AuditLog[];
  quotes: Quote[];
  onRetryPublish: (quoteId: string) => void;
  onClearLogs: () => void;
}

export const LogsPanel: React.FC<LogsPanelProps> = ({
  logs,
  quotes,
  onRetryPublish,
  onClearLogs,
}) => {
  const getQuoteDetails = (quoteId?: string) => {
    if (!quoteId) return null;
    return quotes.find((q) => q.id === quoteId);
  };

  const getLogIcon = (type: AuditLog['type']) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle className="w-4 h-4 text-brand-terracotta dark:text-brand-terracotta" />;
      case 'ERROR':
        return <AlertOctagon className="w-4 h-4 text-brand-terracotta dark:text-brand-terracotta" />;
      case 'RETRY':
        return <RefreshCcw className="w-4 h-4 text-brand-slate dark:text-brand-gold animate-spin" style={{ animationDuration: '3s' }} />;
      default:
        return <Info className="w-4 h-4 text-brand-slate dark:text-brand-gold" />;
    }
  };

  const getLogColorClass = (type: AuditLog['type']) => {
    switch (type) {
      case 'SUCCESS':
        return 'bg-brand-terracotta/10 dark:bg-brand-navy/20 text-brand-navy dark:text-brand-terracotta/80 border-emerald-100 dark:border-emerald-900/40';
      case 'ERROR':
        return 'bg-brand-terracotta/10 dark:bg-brand-navy/20 text-brand-navy dark:text-brand-terracotta/80 border-rose-100 dark:border-rose-900/40';
      case 'RETRY':
        return 'bg-brand-slate/10 dark:bg-brand-navy/20 text-brand-navy dark:text-brand-gold border-indigo-100 dark:border-indigo-900/45';
      default:
        return 'bg-brand-slate/10 dark:bg-brand-navy/20 text-brand-navy dark:text-brand-gold border-blue-100 dark:border-blue-900/45';
    }
  };

  return (
    <div id="logs-panel" className="bg-white dark:bg-brand-navy rounded-2xl shadow-xs border border-brand-gold/20 dark:border-brand-slate/40 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6 border-b border-brand-gold/15 dark:border-brand-slate/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-cream dark:bg-brand-midnight text-brand-navy/80 dark:text-brand-gold/70 rounded-xl animate-pulse">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy dark:text-brand-cream text-lg">System Logs & Publishing Audit Logs</h3>
            <p className="text-xs text-brand-slate dark:text-brand-slate/80 mt-0.5">Real-time chronicle of deduplication, validation, formatting, and platform responses</p>
          </div>
        </div>

        <button
          id="clear-logs-btn"
          onClick={onClearLogs}
          disabled={logs.length === 0}
          className="text-xs text-brand-slate hover:text-brand-navy dark:text-brand-slate/80 dark:hover:text-white border border-brand-gold/25 dark:border-brand-slate/30 px-3 py-1.5 rounded-lg disabled:opacity-40 select-none cursor-pointer hover:bg-brand-cream/80 dark:hover:bg-brand-midnight transition-colors"
        >
          Clear Logs
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10">
          <ScrollText className="w-10 h-10 text-brand-gold/60 dark:text-brand-navy mx-auto mb-2" />
          <p className="text-xs text-brand-slate dark:text-brand-slate/80 max-w-sm mx-auto">No publishing activity logged yet. Attempt to publish or schedule quotes to generate detailed diagnostics.</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {logs.map((log) => {
            const quote = getQuoteDetails(log.quoteId);
            return (
              <div
                key={log.id}
                id={`log-item-${log.id}`}
                className={`p-3.5 rounded-xl border text-xs flex flex-col md:flex-row md:items-start justify-between gap-4 transition-all ${getLogColorClass(
                  log.type
                )}`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-1 bg-white/80 dark:bg-brand-navy rounded-md border border-brand-gold/20/50 dark:border-brand-slate/40">
                    {getLogIcon(log.type)}
                  </div>
                  <div>
                    <div className="font-semibold text-brand-navy dark:text-brand-cream flex items-center gap-2 flex-wrap">
                      <span className="uppercase tracking-wider text-[10px] bg-white dark:bg-brand-navy border dark:border-brand-slate/40 px-1.5 py-0.5 rounded text-brand-navy/80 dark:text-brand-gold">
                        {log.type}
                      </span>
                      <span className="text-brand-slate/80 dark:text-brand-slate/80 font-normal flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1 text-brand-navy dark:text-brand-cream/90 leading-relaxed font-mono text-[11px]">{log.message}</p>

                    {quote && (
                      <div className="mt-2 text-[11px] bg-white/70 dark:bg-brand-navy/70 p-2 rounded border border-brand-gold/20/20 dark:border-brand-slate/40/40 max-w-xl">
                        <span className="font-semibold text-brand-navy dark:text-brand-cream block truncate">
                          "{quote.text}"
                        </span>
                        <span className="text-brand-slate dark:text-brand-slate/80 block text-[10px] mt-0.5">
                          — {quote.author} {quote.source ? `(${quote.source})` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {log.type === 'ERROR' && log.quoteId && (
                  <button
                    id={`retry-log-btn-${log.quoteId}`}
                    onClick={() => onRetryPublish(log.quoteId!)}
                    className="md:self-center bg-brand-slate hover:bg-brand-slate text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    Retry Now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
