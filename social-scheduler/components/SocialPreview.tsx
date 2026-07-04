import React, { useState, useEffect } from 'react';
import { ContentItem } from '../../../shared/types';
import { Twitter, Instagram, Linkedin, Send, MessageSquare, Sparkles, RefreshCcw, Type, Palette, Copy, AlertCircle, CheckCircle } from 'lucide-react';

interface SocialPreviewProps {
  quote: ContentItem | null; // Generalized item
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
  const [previewMode, setPreviewMode] = useState<'visual' | 'document'>('visual');
  
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
      setEditedText(quote.type === 'Quote' ? `"${quote.text}"\n\n— {quote.author}` : quote.text);
      // Auto-set preview mode based on format type
      if (quote.type === 'Blog' || quote.type === 'Newsletter' || quote.type === 'Script') {
        setPreviewMode('document');
      } else {
        setPreviewMode('visual');
      }
    } else {
      setEditedText("");
    }
  }, [quote]);

  if (!quote) {
    return (
      <div id="no-quote-preview" className="bg-stone-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-stone-200 dark:border-slate-800 p-10 text-center transition-colors">
        <Sparkles className="w-10 h-10 text-stone-300 dark:text-slate-750 mx-auto mb-2 animate-pulse" />
        <h4 className="text-sm font-semibold text-stone-700 dark:text-slate-300 font-sans">Preview Designer Sandbox</h4>
        <p className="text-xs text-stone-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          Select any content item (Quote, Blog, Social Thread) from your repository to preview character limits or format visual cards.
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
    setEditedText(quote.type === 'Quote' ? `"${quote.text}"\n\n— ${quote.author}` : quote.text);
  };

  return (
    <div id={`social-preview-designer-${quote.id}`} className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 p-6 space-y-6 transition-colors duration-200">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 dark:border-slate-800 pb-4">
        <div>
          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
            {quote.type} • {quote.category || "General"}
          </span>
          <h3 className="font-semibold text-gray-900 dark:text-white text-lg mt-1">Universal Previewer Sandbox</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Preview & format long-form markdown text or generate social image cards.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg bg-gray-100 dark:bg-slate-800 p-1 text-xs">
            <button
              onClick={() => setPreviewMode('visual')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${previewMode === 'visual' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500'}`}
            >
              Visual Card
            </button>
            <button
              onClick={() => setPreviewMode('document')}
              className={`px-3 py-1 rounded-md font-semibold transition-all ${previewMode === 'document' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-gray-500'}`}
            >
              Document / Text
            </button>
          </div>

          <button
            id="reset-preview-btn"
            onClick={resetToOriginal}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 font-medium cursor-pointer"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
            Reset Original
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Editor Form */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              Edit Content Draft
            </label>
            <textarea
              id="raw-quote-editor"
              rows={quote.type === 'Quote' ? 4 : 10}
              value={editedText}
              onChange={(e) => {
                setEditedText(e.target.value);
                onEditQuoteText(quote.id, e.target.value);
              }}
              className="w-full text-xs text-gray-850 dark:text-slate-200 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-950 rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed font-sans transition-colors"
              placeholder="Configure text content here..."
            />
          </div>

          {activeTab === 'linkedin' && (
            <div className="p-3.5 bg-sky-50 dark:bg-sky-955/20 rounded-xl border border-sky-100 dark:border-sky-900/30 space-y-1.5">
              <label className="block text-[10px] font-bold text-sky-950 dark:text-sky-300 uppercase tracking-wider">
                Hashtags (LinkedIn optimized)
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
            <span className="block text-[10px] font-bold text-gray-400 dark:text-slate-505 uppercase tracking-widest">
              Select Preview Platform Layout
            </span>
            <div className="grid grid-cols-5 gap-1 bg-gray-50 dark:bg-slate-950/40 p-1 rounded-xl border border-gray-100 dark:border-slate-800/80">
              <button
                id="tab-twitter"
                type="button"
                onClick={() => setActiveTab('twitter')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'twitter' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' : 'text-gray-500 hover:text-gray-900'
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
                  activeTab === 'instagram' ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs' : 'text-gray-500 hover:text-gray-900'
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
                  activeTab === 'linkedin' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-gray-500 hover:text-gray-900'
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
                  activeTab === 'telegram' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs' : 'text-gray-500 hover:text-gray-900'
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
                  activeTab === 'whatsapp' ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-gray-500 hover:text-gray-900'
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
              className="flex items-center gap-1 text-gray-600 dark:text-slate-300 hover:text-gray-900 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-850 px-3 py-1.5 rounded-lg text-[11px] cursor-pointer transition-colors"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied!" : "Copy Content"}</span>
            </button>
          </div>

          {isOverTwitterLimit && (
            <div id="twitter-limit-alert" className="p-2.5 bg-rose-50 dark:bg-rose-955/20 text-rose-800 border-l-4 border-rose-500 rounded-r-lg text-[10px]">
              <strong>Exceeds Twitter Limit:</strong> Twitter restricts updates to 280 characters. Please edit down text.
            </div>
          )}
        </div>

        {/* Right Side: Simulator Canvas */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          
          {previewMode === 'visual' ? (
            /* Visual Card Preview (Instagram Quotes Mode) */
            <div id="instagram-simulator" className="bg-slate-50 dark:bg-slate-950/20 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
              <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 text-[10px]">
                <div className="flex items-center gap-1 pr-2 border-r border-gray-100 dark:border-slate-800">
                  <Palette className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-bold text-gray-650 dark:text-slate-350">Theme:</span>
                </div>
                {GRADIENTS.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => setActiveGradient(g)}
                    className={`px-2 py-1 rounded-md text-[9px] font-semibold transition-all cursor-pointer ${
                      activeGradient.name === g.name ? 'ring-2 ring-indigo-650 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-600'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2.5 bg-white dark:bg-slate-950/40 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 text-[10px]">
                <div className="flex items-center gap-1 border-r border-gray-100 dark:border-slate-800 pr-2">
                  <Type className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="font-bold text-gray-655">Font:</span>
                </div>
                {FONTS.map((f) => (
                  <button
                    key={f.name}
                    onClick={() => setActiveFont(f)}
                    className={`px-2 py-1 rounded-md text-[9px] font-semibold transition-all cursor-pointer ${
                      activeFont.name === f.name ? 'ring-2 ring-indigo-650 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-200' : 'bg-gray-100 dark:bg-slate-800 text-gray-600'
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div
                className={`${activeGradient.value} aspect-square w-full max-w-sm mx-auto rounded-xl shadow-lg relative flex flex-col items-center justify-between p-8 text-center bg-gradient-to-br`}
              >
                <div className="flex items-center justify-between w-full opacity-65 text-[10px] uppercase tracking-wider font-mono">
                  <span>{quote.type} GRAPHIC</span>
                  <span>AI VERIFIED</span>
                </div>

                <div className="my-auto py-4">
                  <p className={`text-base md:text-lg leading-relaxed ${activeFont.value}`}>
                    "{quote.text.substring(0, 250)}{quote.text.length > 250 ? '...' : ''}"
                  </p>
                  
                  {showAuthorTitle && (
                    <p className="text-xs mt-4 font-mono uppercase tracking-widest font-semibold opacity-85">
                      — {quote.author}
                    </p>
                  )}

                  {showCitation && quote.source && (
                    <p className="text-[10px] mt-1 font-sans italic opacity-60">
                      via {quote.source}
                    </p>
                  )}
                </div>

                <div className="opacity-50 text-[9px] font-mono tracking-widest">
                  PUBLISHED VIA AUTOMATION FACTORY
                </div>
              </div>
            </div>
          ) : (
            /* Document Preview Mode (Articles, Scripts, Emails) */
            <div className="p-5 bg-stone-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-805 rounded-2xl min-h-[350px] shadow-inner select-text">
              <div className="border-b border-gray-200 dark:border-slate-800 pb-3 mb-4 flex items-center justify-between text-xs text-gray-500">
                <span className="font-bold text-gray-800 dark:text-white uppercase tracking-wider">Document Previewer</span>
                <span className="font-mono">{editedText.split(/\s+/).length} words</span>
              </div>

              <article className="prose dark:prose-invert prose-stone max-w-none text-xs text-gray-900 dark:text-slate-200 leading-relaxed font-sans font-normal space-y-4">
                {quote.title && (
                  <h1 className="text-lg font-bold text-gray-950 dark:text-white border-b border-gray-150 pb-2 mb-3">
                    {quote.title}
                  </h1>
                )}
                <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-slate-500 font-mono mb-4">
                  <span>Author: {quote.author}</span>
                  <span>•</span>
                  <span>Category: {quote.category}</span>
                </div>

                <p className="whitespace-pre-wrap font-sans text-gray-850 dark:text-slate-300">
                  {editedText}
                </p>
              </article>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
