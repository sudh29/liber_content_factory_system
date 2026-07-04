import React from 'react';
import { Quote } from '../../../shared/types';
import { BarChart, TrendingUp, Users, Eye, Heart, Share2, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AnalyticsChartsProps {
  quotes: Quote[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ quotes }) => {
  const totalCount = quotes.length;
  const publishedCount = quotes.filter((q) => q.status === 'Published').length;
  const scheduledCount = quotes.filter((q) => q.status === 'Scheduled').length;
  const unpublishedCount = quotes.filter((q) => q.status === 'Unpublished').length;

  // Compute mock aggregated metrics
  const totalImpressions = quotes.reduce((acc, q) => acc + (q.engagement?.impressions || 0), 0);
  const totalLikes = quotes.reduce((acc, q) => acc + (q.engagement?.likes || 0), 0);
  const totalShares = quotes.reduce((acc, q) => acc + (q.engagement?.shares || 0), 0);

  // Platform breakdown mock
  const platformLikes = {
    twitter: 142,
    linkedin: 231,
    telegram: 89,
    instagram: 345,
    facebook: 112,
  };

  // Safe checks for ratio
  const queueDepletionPct = totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0;

  return (
    <div id="analytics-section" className="space-y-6">
      
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric 1 */}
        <div id="metric-total-verified" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Verified Database</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950 dark:text-white font-sans">{totalCount}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-400">Authentic quotes</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Metric 2 */}
        <div id="metric-published-queue" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Published Stream</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950 dark:text-white font-sans">{publishedCount}</span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{queueDepletionPct}% Depleted</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-1 rounded-full" style={{ width: `${queueDepletionPct}%` }}></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div id="metric-unpublished" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Unused Quota Size</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950 dark:text-white font-sans">{unpublishedCount}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-400">Ready to schedule</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-1 rounded-full" style={{ width: `${totalCount > 0 ? (unpublishedCount / totalCount) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* Metric 4 */}
        <div id="metric-total-engagement" className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between text-gray-400 dark:text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Engagement</span>
            <TrendingUp className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-950 dark:text-white font-sans">{(totalImpressions + totalLikes + totalShares).toLocaleString()}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-400">Total points</span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-rose-500 h-1 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>

      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Stunning interactive SVG engagement analytics map */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Engagement Points Breakdown</h4>
                <p className="text-[11px] text-gray-400 dark:text-gray-400">Historic metrics tracking impressions, actions and approvals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-indigo-600 rounded-sm"></span> Impressions
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Actions
              </span>
            </div>
          </div>

          {publishedCount === 0 ? (
            <div className="text-center py-12 text-gray-400 dark:text-gray-400 text-xs">
              Waiting for publishing data to feed live trends. Live stats automatically populate once quotes leave the queue.
            </div>
          ) : (
            <div className="space-y-4">
              {quotes
                .filter((q) => q.status === 'Published' && q.engagement)
                .map((q) => {
                  const impressions = q.engagement?.impressions || 0;
                  const engagements = (q.engagement?.likes || 0) + (q.engagement?.shares || 0);
                  const maxImpressions = 2000;
                  const impWidth = Math.min((impressions / maxImpressions) * 100, 100);
                  const engWidth = Math.min((engagements / maxImpressions) * 400, 100);

                  return (
                    <div key={q.id} className="space-y-1.5 p-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 rounded-lg transition-colors">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-xs md:max-w-md">"{q.text}"</span>
                        <span className="text-gray-400 dark:text-gray-400 text-[10px]">{q.author}</span>
                      </div>
                      
                      <div className="space-y-1">
                        {/* Impressions Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-400 dark:text-gray-450 w-16 text-right">Viewers:</span>
                          <div className="flex-1 bg-gray-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden flex items-center pr-1.5">
                            <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${impWidth}%` }}></div>
                            <span className="text-[9px] font-bold font-mono ml-2 text-indigo-950 dark:text-indigo-200">{impressions}</span>
                          </div>
                        </div>

                        {/* Likes/Shares Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-gray-400 dark:text-gray-455 w-16 text-right">Reactions:</span>
                          <div className="flex-1 bg-gray-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex items-center pr-1.5">
                            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${engWidth}%` }}></div>
                            <span className="text-[9px] font-bold font-mono ml-2 text-emerald-950 dark:text-emerald-200">{engagements} ({q.engagement?.likes} L, {q.engagement?.shares} S)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Right Side: Platform breakdown ring & share statistics */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors duration-200">
          <div className="space-y-1.5 pb-4 border-b border-gray-50 dark:border-slate-800">
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Platform Distribution</h4>
            <p className="text-[11px] text-gray-400 dark:text-gray-400">Total metrics generated per integrated social channel</p>
          </div>

          <div className="py-6 space-y-4">
            {/* Platform 1: Instagram */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-pink-600 dark:text-pink-400">Instagram Feed</span>
                <span className="text-gray-500 dark:text-gray-400 text-[10px]">37.6% (345 pts)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-pink-500 h-2" style={{ width: '37.6%' }}></div>
              </div>
            </div>

            {/* Platform 2: LinkedIn */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-blue-700 dark:text-blue-400">LinkedIn Business</span>
                <span className="text-gray-500 dark:text-gray-400 text-[10px]">25.1% (231 pts)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-2" style={{ width: '25.1%' }}></div>
              </div>
            </div>

            {/* Platform 3: X / Twitter */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-slate-800 dark:text-slate-300">X (formerly Twitter)</span>
                <span className="text-gray-500 dark:text-gray-450 text-[10px]">15.4% (142 pts)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-slate-900 dark:bg-slate-800 h-2" style={{ width: '15.4%' }}></div>
              </div>
            </div>

            {/* Platform 4: Telegram */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-sky-500 dark:text-sky-455">Telegram Channels</span>
                <span className="text-gray-500 dark:text-gray-400 text-[10px]">9.7% (89 pts)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-sky-400 h-2" style={{ width: '9.7%' }}></div>
              </div>
            </div>

            {/* Platform 5: WhatsApp / Others */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">WhatsApp Broadcasts</span>
                <span className="text-gray-500 dark:text-gray-400 text-[10px]">12.2% (112 pts)</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-850 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-2" style={{ width: '12.2%' }}></div>
              </div>
            </div>

          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100/80 dark:border-slate-800/80 rounded-xl">
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block uppercase font-bold tracking-wider mb-1">
              Publishing Audit Stat
            </span>
            <p className="text-[10px] text-gray-600 dark:text-gray-350 leading-normal">
              Accumulates impressions directly from active web sessions and simulated dynamic social tracking variables in real-time.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
