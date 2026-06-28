import React from 'react';
import { AuditLog, Quote } from '../../../shared/types';
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
        return <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-450" />;
      case 'ERROR':
        return <AlertOctagon className="w-4 h-4 text-rose-600 dark:text-rose-450" />;
      case 'RETRY':
        return <RefreshCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin" style={{ animationDuration: '3s' }} />;
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getLogColorClass = (type: AuditLog['type']) => {
    switch (type) {
      case 'SUCCESS':
        return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-955 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40';
      case 'ERROR':
        return 'bg-rose-50 dark:bg-rose-950/20 text-rose-955 dark:text-rose-300 border-rose-100 dark:border-rose-900/40';
      case 'RETRY':
        return 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-955 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/45';
      default:
        return 'bg-blue-50 dark:bg-blue-950/20 text-blue-955 dark:text-blue-300 border-blue-100 dark:border-blue-900/45';
    }
  };

  return (
    <div id="logs-panel" className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-6 border-b border-gray-50 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 rounded-xl animate-pulse">
            <ScrollText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">System Logs & Publishing Audit Logs</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Real-time chronicle of deduplication, validation, formatting, and platform responses</p>
          </div>
        </div>

        <button
          id="clear-logs-btn"
          onClick={onClearLogs}
          disabled={logs.length === 0}
          className="text-xs text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white border border-gray-200 dark:border-slate-700 px-3 py-1.5 rounded-lg disabled:opacity-40 select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-850 transition-colors"
        >
          Clear Logs
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-10">
          <ScrollText className="w-10 h-10 text-gray-300 dark:text-slate-800 mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-slate-400 max-w-sm mx-auto">No publishing activity logged yet. Attempt to publish or schedule quotes to generate detailed diagnostics.</p>
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
                  <div className="mt-0.5 p-1 bg-white/80 dark:bg-slate-900 rounded-md border border-gray-100/50 dark:border-slate-800">
                    {getLogIcon(log.type)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                      <span className="uppercase tracking-wider text-[10px] bg-white dark:bg-slate-900 border dark:border-slate-800 px-1.5 py-0.5 rounded text-gray-803 dark:text-slate-300">
                        {log.type}
                      </span>
                      <span className="text-gray-400 dark:text-slate-450 font-normal flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-800 dark:text-slate-200 leading-relaxed font-mono text-[11px]">{log.message}</p>

                    {quote && (
                      <div className="mt-2 text-[11px] bg-white/70 dark:bg-slate-900/70 p-2 rounded border border-gray-100/20 dark:border-slate-800/40 max-w-xl">
                        <span className="font-semibold text-gray-900 dark:text-white block truncate">
                          "{quote.text}"
                        </span>
                        <span className="text-gray-500 dark:text-slate-400 block text-[10px] mt-0.5">
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
                    className="md:self-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-xs"
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
