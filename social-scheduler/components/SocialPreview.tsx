import React, { useState, useEffect } from 'react';
import { Quote } from '../../../shared/types';
import { Twitter, Instagram, Linkedin, Send, MessageSquare, Sparkles, RefreshCcw, Type, Palette, Copy, AlertCircle, CheckCircle } from 'lucide-react';

interface SocialPreviewProps {
  quote: Quote | null;
  onEditQuoteText: (quoteId: string, newText: string) => void;
}

const GRADIENTS = [
  { name: "Obsidian Night", value: "from-gray-900 to-black text-white" },
  { name: "Sunset Gold", value: "from-amber-500 via-orange-600 to-rose-700 text-white" },
  { name: "Amethyst Ocean", value: "from-blue-600 via-indigo-600 to-purple-800 text-white" },
  { name: "Forest Sage", value: "from-emerald-800 to-teal-950 text-emerald-50" },
  { name: "Soft Alabaster", value: "from-stone-50 via-neutral-100 to-stone-200 text-gray-900 border border-gray-200" },
  { name: "Rose Whisper", value: "from-rose-500 via-pink-600 to-amber-400 text-white" },
];

const FONTS = [
  { name: "Modern Sans", value: "font-sans font-medium tracking-tight" },
  { name: "Editorial Serif", value: "font-serif italic tracking-wide" },
  { name: "Space Mono", value: "font-mono font-normal tracking-tight" },
];

export const SocialPreview: React.FC<SocialPreviewProps> = ({ quote, onEditQuoteText }) => {
  const [activeTab, setActiveTab] = useState<'twitter' | 'instagram' | 'linkedin' | 'telegram' | 'whatsapp'>('twitter');
  
  // Customization of post text
  const [editedText, setEditedText] = useState("");
  const [customHashtags, setCustomHashtags] = useState("#quotes #wisdom #philosophy");
  
  // Card visual editor settings
  const [activeGradient, setActiveGradient] = useState(GRADIENTS[2]);
  const [activeFont, setActiveFont] = useState(FONTS[1]);
  const [showAuthorTitle, setShowAuthorTitle] = useState(true);
  const [showCitation, setShowCitation] = useState(true);
  
  // Notice systems
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (quote) {
      setEditedText(`"${quote.text}"\n\n— ${quote.author}`);
    } else {
      setEditedText("");
    }
  }, [quote]);  if (!quote) {
    return (
      <div id="no-quote-preview" className="bg-stone-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800 p-10 text-center transition-colors">
        <Sparkles className="w-10 h-10 text-stone-300 dark:text-slate-750 mx-auto mb-2 animate-pulse" />
        <h4 className="text-sm font-semibold text-stone-700 dark:text-slate-300 font-sans">Preview Designer Sandbox</h4>
        <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          Select or custom-create any quote from your repository database block to explore real-time character formatting and post graphics.
        </p>
      </div>
    );
  }

  // Calculate limits
  const twitterCharLimit = 280;
  const currentLen = editedText.length + (activeTab === 'linkedin' ? `\n\n${customHashtags}`.length : 0);
  const isOverTwitterLimit = activeTab === 'twitter' && currentLen > twitterCharLimit;

  const handleCopyText = () => {
    const textToCopy = activeTab === 'linkedin' ? `${editedText}\n\n${customHashtags}` : editedText;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetToOriginal = () => {
    setEditedText(`"${quote.text}"\n\n— ${quote.author}`);
  };

  return (
    <div id={`social-preview-designer-${quote.id}`} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 p-6 space-y-6 transition-colors duration-200">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 dark:border-slate-800 pb-4">
        <div>
          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
            {quote.category || "General"}
          </span>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mt-1">Multi-Channel Social Previewer</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Preview & format the authentic quote across platforms with responsive design simulators.</p>
        </div>
        
        <button
          id="reset-preview-btn"
          onClick={resetToOriginal}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-805 dark:hover:text-indigo-300 flex items-center gap-1 select-none font-medium cursor-pointer"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reset Original Text
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Editor Form */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Format Raw Content Block
            </label>
            <textarea
              id="raw-quote-editor"
              rows={5}
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full text-xs text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans transition-colors"
              placeholder="Configure quote publication wording here..."
            />
          </div>

          {activeTab === 'linkedin' && (
            <div className="p-3.5 bg-sky-50 dark:bg-sky-950/20 rounded-xl border border-sky-100 dark:border-sky-900/30 space-y-1.5 transition-colors">
              <label className="block text-[10px] font-bold text-sky-950 dark:text-sky-305 uppercase tracking-wider">
                Professional HashTags (LinkedIn Special)
              </label>
              <input
                id="linkedin-hashtags-input"
                type="text"
                value={customHashtags}
                onChange={(e) => setCustomHashtags(e.target.value)}
                className="w-full text-xs text-sky-900 dark:text-sky-200 bg-white dark:bg-slate-900 border border-sky-200/50 dark:border-sky-900/40 rounded-lg px-2.5 py-1.5 focus:outline-none"
              />
            </div>
          )}

          {/* Social Tabs Controls */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              Select Preview Simulator Platform
            </span>
            <div className="grid grid-cols-5 gap-1 bg-gray-50 dark:bg-slate-950/40 p-1 rounded-xl border border-gray-100 dark:border-slate-800/80 transition-colors">
              <button
                id="tab-twitter"
                type="button"
                onClick={() => setActiveTab('twitter')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'twitter' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-205'
                }`}
              >
                <Twitter className="w-4 h-4 text-sky-500" />
                <span className="text-[9px]">X / Twitter</span>
              </button>
              
              <button
                id="tab-instagram"
                type="button"
                onClick={() => setActiveTab('instagram')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'instagram' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-205'
                }`}
              >
                <Instagram className="w-4 h-4 text-pink-500" />
                <span className="text-[9px]">Instagram</span>
              </button>

              <button
                id="tab-linkedin"
                type="button"
                onClick={() => setActiveTab('linkedin')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'linkedin' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-205'
                }`}
              >
                <Linkedin className="w-4 h-4 text-blue-500" />
                <span className="text-[9px]">LinkedIn</span>
              </button>

              <button
                id="tab-telegram"
                type="button"
                onClick={() => setActiveTab('telegram')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'telegram' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-450 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-205'
                }`}
              >
                <Send className="w-4 h-4 text-cyan-500" />
                <span className="text-[9px]">Telegram</span>
              </button>

              <button
                id="tab-whatsapp"
                type="button"
                onClick={() => setActiveTab('whatsapp')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'whatsapp' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-450 shadow-xs' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-205'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                <span className="text-[9px]">WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Action Counters / Helpers */}
          <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-50 dark:border-slate-800">
            <div className={`flex items-center gap-1 font-mono text-[11px] ${isOverTwitterLimit ? 'text-rose-600 font-bold' : 'text-gray-500 dark:text-slate-400'}`}>
              <AlertCircle className="w-3.5 h-3.5" />
              <span>
                {currentLen} {activeTab === 'twitter' ? `/ ${twitterCharLimit} chars` : 'characters'}
              </span>
            </div>

            <button
              id="copy-preview-btn"
              onClick={handleCopyText}
              className="flex items-center gap-1 text-gray-650 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-850 px-3 py-1.5 rounded-lg text-[11px] cursor-pointer transition-colors"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Post Ready"}</span>
            </button>
          </div>

          {isOverTwitterLimit && (
            <div id="twitter-limit-alert" className="p-2.5 bg-rose-50 dark:bg-rose-955/20 text-rose-800 dark:text-rose-305 border-l-4 border-rose-500 rounded-r-lg text-[10px] leading-relaxed">
              <strong>Twitter Character Limit Exceeded:</strong> Twitter restricts post sizes to 280 characters. Please edit down this quote wordings.
            </div>
          )}
        </div>

        {/* Right Side: Simulator Canvas */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 text-center sm:text-left">
            Platform Simulator Viewport
          </span>

          {/* Twitter Simulator */}
          {activeTab === 'twitter' && (
            <div id="twitter-simulator" className="p-4 bg-gray-950 text-white rounded-2xl border border-gray-800">
              <div className="flex items-center justify-between border-b border-gray-800/60 pb-3 mb-3 text-xs text-gray-400">
                <span className="font-semibold text-white">𝕏 / Twitter Mobile</span>
                <span>Active Preview</span>
              </div>
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-linear-to-tr from-sky-400 to-indigo-600 flex items-center justify-center text-xs font-bold leading-none shrink-0 tracking-widest shadow-inner text-white select-none capitalize">
                  {quote.author.substring(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-bold text-gray-100 hover:underline cursor-pointer">Daily Publisher Bot</span>
                    <span className="text-gray-500">@DailyQuotesPublishing • Just Now</span>
                  </div>
                  <p className="text-[13px] text-gray-200 mt-2 whitespace-pre-wrap leading-relaxed select-text">
                    {editedText}
                  </p>
                  <div className="mt-2 text-[10px] text-sky-400 flex gap-1.5 select-all">
                    <span>#verifiedQuotes</span> <span>#mindfulness</span> <span>#history</span>
                  </div>
                  
                  <div className="flex justify-between max-w-sm text-gray-500 text-[11px] mt-4 pt-3 border-t border-gray-900 select-none">
                    <span>💬 0</span>
                    <span>🔁 0</span>
                    <span>❤️ 0</span>
                    <span>📊 1</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Instagram Canvas Card with dynamic styling engine */}
          {activeTab === 'instagram' && (
            <div id="instagram-simulator" className="bg-slate-50 dark:bg-slate-950/20 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
              {/* Instagram Card Editor controls */}
              <div className="flex flex-wrap gap-2.5 bg-white dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100/80 dark:border-slate-850/80 text-[10px] transition-colors">
                <div className="flex items-center gap-1 border-r border-gray-100 dark:border-slate-800 pr-2">
                  <Palette className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-bold text-gray-600 dark:text-slate-300">Theme:</span>
                </div>
                {GRADIENTS.map((g) => (
                  <button
                    key={g.name}
                    id={`ins-color-${g.name.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setActiveGradient(g)}
                    className={`px-2 py-1 rounded-md text-[9px] font-semibold transition-all cursor-pointer ${
                      activeGradient.name === g.name ? 'ring-2 ring-indigo-600 dark:ring-indigo-554 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-350 hover:bg-gray-200/50'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2.5 bg-white dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100/80 dark:border-slate-850/80 text-[10px] transition-colors">
                <div className="flex items-center gap-1 border-r border-gray-100 dark:border-slate-800 pr-2">
                  <Type className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-bold text-gray-600 dark:text-slate-300">Typography:</span>
                </div>
                {FONTS.map((f) => (
                  <button
                    key={f.name}
                    id={`ins-font-${f.name.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setActiveFont(f)}
                    className={`px-2 py-1 rounded-md text-[9px] font-semibold transition-all cursor-pointer ${
                      activeFont.name === f.name ? 'ring-2 ring-indigo-600 dark:ring-indigo-554 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-350 hover:bg-gray-200/50'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
                
                <label className="flex items-center gap-1 border-l border-gray-100 dark:border-slate-850 pl-3.5 cursor-pointer text-gray-700 dark:text-slate-350">
                  <input
                    id="toggle-author-title"
                    type="checkbox"
                    checked={showAuthorTitle}
                    onChange={(e) => setShowAuthorTitle(e.target.checked)}
                    className="h-3 w-3 rounded text-indigo-600"
                  />
                  <span>Show Citation Title</span>
                </label>
              </div>

              {/* Square Instagram graphic */}
              <div
                style={{ contentVisibility: 'auto' }}
                className={`${activeGradient.value} aspect-square w-full max-w-sm mx-auto rounded-xl shadow-lg relative flex flex-col items-center justify-between p-8 text-center transition-all bg-gradient-to-br`}
              >
                {/* Visual Header Grid decoration */}
                <div className="flex items-center justify-between w-full opacity-65 text-[10px] uppercase tracking-wider font-mono">
                  <span>DAILY QUOTES</span>
                  <span>VERIFIED ORIGINAL</span>
                </div>

                {/* Big Quote marks decoration */}
                <div className="absolute text-7xl font-serif text-white/10 left-5 top-12 pointer-events-none select-none">“</div>
                <div className="absolute text-7xl font-serif text-white/10 right-5 bottom-12 pointer-events-none select-none">”</div>

                <div className="my-auto py-4">
                  <p className={`text-base md:text-lg leading-relaxed ${activeFont.value}`}>
                    "{quote.text}"
                  </p>
                  
                  {showAuthorTitle && (
                    <p className={`text-xs mt-4 font-mono uppercase tracking-widest font-semibold opacity-85`}>
                      — {quote.author}
                    </p>
                  )}

                  {showCitation && quote.source && (
                    <p className="text-[10px] mt-1 font-sans italic opacity-60">
                      via {quote.source}
                    </p>
                  )}
                </div>

                {/* Footer Tag */}
                <div className="opacity-50 text-[9px] font-mono tracking-widest">
                  PUBLISHED VIA AUTOMATION PLATFORM
                </div>
              </div>
              <p className="text-[11px] text-center text-gray-500 dark:text-slate-450 leading-normal">
                💡 Perfect layout for squared feed updates. Use the customizable gradient selector above to align with your platform's feed color theme palette.
              </p>
            </div>
          )}

          {/* LinkedIn Simulator */}
          {activeTab === 'linkedin' && (
            <div id="linkedin-simulator" className="p-4 bg-white dark:bg-slate-950 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-805 rounded-2xl shadow-xs transition-colors">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-3 text-xs text-blue-700 dark:text-blue-450 font-semibold select-none">
                <span>in / LinkedIn Professional Feed</span>
                <span>Active Preview</span>
              </div>
              <div className="flex gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  in
                </div>
                <div>
                  <div className="text-xs font-sans">
                    <p className="font-semibold text-gray-950 dark:text-white">Attributed Quotes Publisher Hub</p>
                    <p className="text-gray-500 dark:text-slate-450 text-[10px] mt-0.5">Automated REST Engine • 1st • Just Now</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-3.5 space-y-2 text-xs leading-relaxed text-gray-900 dark:text-slate-100 select-text font-sans">
                <p className="whitespace-pre-wrap">{editedText}</p>
                <p className="text-blue-700 dark:text-blue-400 font-medium whitespace-pre-wrap">{customHashtags}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-800 flex justify-between text-gray-500 dark:text-slate-400 text-[11px] font-semibold select-none">
                <span>👍 Like</span>
                <span>💬 Comment</span>
                <span>🔁 Repost</span>
                <span>➡️ Send</span>
              </div>
            </div>
          )}

          {/* Telegram Simulator */}
          {activeTab === 'telegram' && (
            <div id="telegram-simulator" className="p-4 bg-teal-900/10 dark:bg-teal-950/10 text-gray-800 dark:text-slate-200 rounded-2xl border border-teal-200/40 dark:border-teal-900/35 relative" style={{ backgroundImage: 'radial-gradient(#15b097 0.8px, transparent 0.8px)', backgroundSize: '16px 16px' }}>
              <div className="flex items-center justify-between bg-teal-800 text-white rounded-t-xl px-4 py-2.5 text-xs font-semibold shadow-xs select-none">
                <span>📢 Daily Verified Philosophers Quote API</span>
                <span>Telegram Bot API</span>
              </div>
              <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs rounded-b-xl p-3 shadow-inner">
                <div className="max-w-[85%] bg-teal-50 dark:bg-teal-950/60 text-teal-950 dark:text-teal-200 p-3 rounded-2xl rounded-tl-none text-xs leading-relaxed border border-teal-100 dark:border-teal-900 shadow-2xs relative">
                  <div className="font-bold text-[10px] text-teal-800 dark:text-teal-300 mb-1 select-none flex items-center gap-1">
                    <span>📡 PUBLISHING BOT</span>
                    <span className="bg-teal-250 dark:bg-teal-905 text-teal-900 dark:text-teal-100 px-1 rounded text-[8px]">verified</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed font-sans">{editedText}</p>
                  <span className="block text-[9px] text-gray-400 dark:text-slate-450 text-right mt-1 select-none">12:35 PM ✓✓</span>
                </div>
              </div>
            </div>
          )}

          {/* WhatsApp Simulator */}
          {activeTab === 'whatsapp' && (
            <div id="whatsapp-simulator" className="p-4 bg-emerald-50 dark:bg-emerald-950/10 text-gray-800 dark:text-slate-200 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 relative" style={{ backgroundImage: 'radial-gradient(#25d366 0.8px, transparent 0.8px)' }}>
              <div className="flex items-center justify-between bg-emerald-600 text-white rounded-t-xl px-4 py-2 text-xs font-bold leading-normal shadow-xs select-none animation-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-800 text-[10px] flex items-center justify-center font-bold font-mono">Q</div>
                  <span>Verified Quotes Stream</span>
                </div>
                <span>REST API Hub</span>
              </div>
              <div className="bg-stone-100 dark:bg-slate-900/70 p-3 rounded-b-xl border border-stone-200/50 dark:border-slate-800 shadow-inner">
                <div className="ml-auto max-w-[85%] bg-emerald-150 dark:bg-emerald-950/50 text-emerald-955 dark:text-emerald-250 p-3 rounded-xl rounded-tr-none text-xs leading-relaxed border border-emerald-200/40 dark:border-emerald-800/40 shadow-2xs">
                  <p className="whitespace-pre-wrap leading-relaxed font-sans block">{editedText}</p>
                  <span className="block text-[9px] text-gray-400 dark:text-slate-455 text-right mt-1 select-none">just now</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-955 dark:text-indigo-200 border border-indigo-150 dark:border-indigo-900/50 rounded-xl flex items-start gap-2 text-xs leading-relaxed">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
            <div>
              <strong className="block font-semibold">Integrations Verification Notice</strong>
              This application has a unified deduplication engine. Only non-published quotes are published. If you click "Publish Now" on this quote, the status will automatically change, preventing it from ever being posted again.
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
