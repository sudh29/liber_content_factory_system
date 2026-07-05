import React from 'react';
import { ContentItem } from '../../shared/types';
import { BarChart, TrendingUp, Users, Eye, Heart, Share2, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AnalyticsChartsProps {
  quotes: ContentItem[];
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
        <div id="metric-total-verified" className="bg-white dark:bg-brand-navy p-5 rounded-2xl border border-brand-gold/20 dark:border-brand-slate/40 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between text-brand-slate dark:text-brand-gold mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate dark:text-brand-gold/80">Verified Database</span>
            <ShieldCheck className="w-4 h-4 text-brand-terracotta" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-navy dark:text-brand-cream font-display">{totalCount}</span>
            <span className="text-[10px] text-brand-slate dark:text-brand-gold/70">Authentic quotes</span>
          </div>
          <div className="w-full bg-brand-cream dark:bg-brand-midnight h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-brand-terracotta h-1 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        {/* Metric 2 */}
        <div id="metric-published-queue" className="bg-white dark:bg-brand-navy p-5 rounded-2xl border border-brand-gold/20 dark:border-brand-slate/40 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between text-brand-slate dark:text-brand-gold mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate dark:text-brand-gold/80">Published Stream</span>
            <CheckCircle2 className="w-4 h-4 text-brand-slate" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-navy dark:text-brand-cream font-display">{publishedCount}</span>
            <span className="text-[10px] text-brand-gold dark:text-brand-gold font-semibold">{queueDepletionPct}% Depleted</span>
          </div>
          <div className="w-full bg-brand-cream dark:bg-brand-midnight h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-brand-slate h-1 rounded-full" style={{ width: `${queueDepletionPct}%` }}></div>
          </div>
        </div>

        {/* Metric 3 */}
        <div id="metric-unpublished" className="bg-white dark:bg-brand-navy p-5 rounded-2xl border border-brand-gold/20 dark:border-brand-slate/40 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between text-brand-slate dark:text-brand-gold mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate dark:text-brand-gold/80">Unused Quota Size</span>
            <Calendar className="w-4 h-4 text-brand-gold" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-navy dark:text-brand-cream font-display">{unpublishedCount}</span>
            <span className="text-[10px] text-brand-slate dark:text-brand-gold/70">Ready to schedule</span>
          </div>
          <div className="w-full bg-brand-cream dark:bg-brand-midnight h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-brand-gold h-1 rounded-full" style={{ width: `${totalCount > 0 ? (unpublishedCount / totalCount) * 100 : 0}%` }}></div>
          </div>
        </div>

        {/* Metric 4 */}
        <div id="metric-total-engagement" className="bg-white dark:bg-brand-navy p-5 rounded-2xl border border-brand-gold/20 dark:border-brand-slate/40 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between text-brand-slate dark:text-brand-gold mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-slate dark:text-brand-gold/80">Total Engagement</span>
            <TrendingUp className="w-4 h-4 text-brand-terracotta" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-brand-navy dark:text-brand-cream font-display">{(totalImpressions + totalLikes + totalShares).toLocaleString()}</span>
            <span className="text-[10px] text-brand-slate dark:text-brand-gold/70">Total points</span>
          </div>
          <div className="w-full bg-brand-cream dark:bg-brand-midnight h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-brand-terracotta h-1 rounded-full" style={{ width: '85%' }}></div>
          </div>
        </div>

      </div>

      {/* Main Charts area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Stunning interactive SVG engagement analytics map */}
        <div className="lg:col-span-8 bg-white dark:bg-brand-navy p-6 rounded-2xl border border-brand-gold/20 dark:border-brand-slate/40 shadow-xs transition-colors duration-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-brand-terracotta" />
              <div>
                <h4 className="font-semibold text-brand-navy dark:text-brand-cream text-sm font-display">Engagement Points Breakdown</h4>
                <p className="text-[11px] text-brand-slate dark:text-brand-gold/70">Historic metrics tracking impressions, actions and approvals</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-[10px] text-brand-slate dark:text-brand-gold/70">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-brand-slate rounded-sm"></span> Impressions
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 bg-brand-terracotta rounded-sm"></span> Actions
              </span>
            </div>
          </div>

          {publishedCount === 0 ? (
            <div className="text-center py-12 text-brand-slate dark:text-brand-gold/60 text-xs">
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
                    <div key={q.id} className="space-y-1.5 p-2 hover:bg-brand-cream/50 dark:hover:bg-brand-midnight/60 rounded-lg transition-colors">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-semibold text-brand-navy dark:text-brand-cream truncate max-w-xs md:max-w-md">"{q.text}"</span>
                        <span className="text-brand-slate dark:text-brand-gold/70 text-[10px]">{q.author}</span>
                      </div>
                      
                      <div className="space-y-1">
                        {/* Impressions Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-brand-slate dark:text-brand-gold/70 w-16 text-right">Viewers:</span>
                          <div className="flex-1 bg-brand-cream dark:bg-brand-midnight h-2.5 rounded-full overflow-hidden flex items-center pr-1.5">
                            <div className="bg-brand-slate h-2.5 rounded-full transition-all duration-500" style={{ width: `${impWidth}%` }}></div>
                            <span className="text-[9px] font-bold font-mono ml-2 text-brand-navy dark:text-brand-cream">{impressions}</span>
                          </div>
                        </div>

                        {/* Likes/Shares Bar */}
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-brand-slate dark:text-brand-gold/70 w-16 text-right">Reactions:</span>
                          <div className="flex-1 bg-brand-cream dark:bg-brand-midnight h-2 rounded-full overflow-hidden flex items-center pr-1.5">
                            <div className="bg-brand-terracotta h-2 rounded-full transition-all duration-500" style={{ width: `${engWidth}%` }}></div>
                            <span className="text-[9px] font-bold font-mono ml-2 text-brand-navy dark:text-brand-cream">{engagements} ({q.engagement?.likes} L, {q.engagement?.shares} S)</span>
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
        <div className="lg:col-span-4 bg-white dark:bg-brand-navy p-6 rounded-2xl border border-brand-gold/20 dark:border-brand-slate/40 shadow-xs flex flex-col justify-between transition-colors duration-200">
          <div className="space-y-1.5 pb-4 border-b border-brand-gold/15 dark:border-brand-slate/30">
            <h4 className="font-semibold text-brand-navy dark:text-brand-cream text-sm font-display">Platform Distribution</h4>
            <p className="text-[11px] text-brand-slate dark:text-brand-gold/70">Total metrics generated per integrated social channel</p>
          </div>

          <div className="py-6 space-y-4">
            {/* Platform 1: Instagram */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-brand-terracotta">Instagram Feed</span>
                <span className="text-brand-slate dark:text-brand-gold/70 text-[10px]">37.6% (345 pts)</span>
              </div>
              <div className="w-full bg-brand-cream dark:bg-brand-midnight h-2 rounded-full overflow-hidden">
                <div className="bg-brand-terracotta h-2" style={{ width: '37.6%' }}></div>
              </div>
            </div>

            {/* Platform 2: LinkedIn */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-brand-slate dark:text-brand-gold">LinkedIn Business</span>
                <span className="text-brand-slate dark:text-brand-gold/70 text-[10px]">25.1% (231 pts)</span>
              </div>
              <div className="w-full bg-brand-cream dark:bg-brand-midnight h-2 rounded-full overflow-hidden">
                <div className="bg-brand-slate h-2" style={{ width: '25.1%' }}></div>
              </div>
            </div>

            {/* Platform 3: X / Twitter */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-brand-navy dark:text-brand-cream">X (formerly Twitter)</span>
                <span className="text-brand-slate dark:text-brand-gold/70 text-[10px]">15.4% (142 pts)</span>
              </div>
              <div className="w-full bg-brand-cream dark:bg-brand-midnight h-2 rounded-full overflow-hidden">
                <div className="bg-brand-navy dark:bg-brand-cream/60 h-2" style={{ width: '15.4%' }}></div>
              </div>
            </div>

            {/* Platform 4: Telegram */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-brand-gold">Telegram Channels</span>
                <span className="text-brand-slate dark:text-brand-gold/70 text-[10px]">9.7% (89 pts)</span>
              </div>
              <div className="w-full bg-brand-cream dark:bg-brand-midnight h-2 rounded-full overflow-hidden">
                <div className="bg-brand-gold h-2" style={{ width: '9.7%' }}></div>
              </div>
            </div>

            {/* Platform 5: WhatsApp / Others */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="font-semibold text-brand-slate dark:text-brand-gold">WhatsApp Broadcasts</span>
                <span className="text-brand-slate dark:text-brand-gold/70 text-[10px]">12.2% (112 pts)</span>
              </div>
              <div className="w-full bg-brand-cream dark:bg-brand-midnight h-2 rounded-full overflow-hidden">
                <div className="bg-brand-slate/70 h-2" style={{ width: '12.2%' }}></div>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

