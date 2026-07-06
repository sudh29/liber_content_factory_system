import React, { useState, useEffect, useRef } from 'react';
import { ContentItem, ContentType } from '../types';
import { Sparkles, Terminal, ShieldCheck, AlertTriangle, Eye, ArrowRight, Loader2, RefreshCcw, Layers, FileText, CheckCircle2, Calendar } from 'lucide-react';
import { SocialPreview } from './SocialPreview';
import { DEFAULT_QUOTES } from '../data/defaultContent';

interface ContentGenerationProps {
  onAddQuote: (newQuote: Omit<ContentItem, 'id' | 'status'>) => boolean | Promise<boolean>;
  onNavigateToTab: (tab: 'dashboard' | 'library' | 'preview' | 'schedule') => void;
  setSelectedQuote: (quote: ContentItem | null) => void;
}

interface PipelineStep {
  agent: string;
  status: 'PENDING' | 'STARTED' | 'COMPLETED' | 'FAILED' | 'WARNING';
  message: string;
  details?: any;
}

export const ContentGeneration: React.FC<ContentGenerationProps> = ({
  onAddQuote,
  onNavigateToTab,
  setSelectedQuote,
}) => {
  const [contentType, setContentType] = useState<ContentType>('Quote');
  const [promptText, setPromptText] = useState('');
  const [simulateMode, setSimulateMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  // Results panel state
  const [generatedItem, setGeneratedItem] = useState<ContentItem | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs]);

  const addConsoleLog = (text: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, `[${timestamp}] ${text}`]);
  };

  const getStrategyName = (type: ContentType): string => {
    switch (type) {
      case 'Quote': return 'quotes';
      case 'Blog': return 'blog';
      case 'Social': return 'twitter_thread';
      case 'Newsletter': return 'newsletter';
      case 'Script': return 'youtube_script';
      default: return 'instagram';
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setFormError(null);
    setFormSuccess(null);
    setGeneratedItem(null);
    setConsoleLogs([]);

    const strategy = getStrategyName(contentType);
    addConsoleLog(`Initiating generation pipeline for type: ${contentType} (strategy: ${strategy})...`);

    // Define the sequence of agents
    const initialSteps: PipelineStep[] = [
      { agent: 'Planner', status: 'PENDING', message: 'Discovering candidate items based on input theme.' },
      { agent: 'DuplicateDetector', status: 'PENDING', message: 'Checking against previously published database records.' },
      { agent: 'Ranker', status: 'PENDING', message: 'Evaluating content quality, engagement potential, and relevance.' },
      { agent: 'Researcher', status: 'PENDING', message: 'Enriching candidate topics with citation facts and background context.' },
      { agent: 'Generator', status: 'PENDING', message: 'Synthesizing final creative content block.' },
      { agent: 'Validator', status: 'PENDING', message: 'Auditing draft formatting guidelines and call-to-actions.' },
      { agent: 'Formatter', status: 'PENDING', message: 'Adapting draft copies for targeted channels.' },
      { agent: 'MediaGenerator', status: 'PENDING', message: 'Formulating visual prompt instructions and color graphics.' },
    ];
    setPipelineSteps(initialSteps);

    // ── Sandbox Simulator: use local default data, no API call ──
    if (simulateMode) {
      addConsoleLog(`SANDBOX MODE: Running local simulation (no API call)...`);

      try {
        // Pick a random quote from the default pool
        const pool = DEFAULT_QUOTES.filter((q) => q.status === 'Unpublished');
        const picked = pool.length > 0
          ? pool[Math.floor(Math.random() * pool.length)]
          : DEFAULT_QUOTES[Math.floor(Math.random() * DEFAULT_QUOTES.length)];

        // Simulate each pipeline step with a delay
        const simulatedMessages = [
          `Discovered ${Math.floor(Math.random() * 5) + 3} candidate items from local repository.`,
          `No duplicates detected. All candidates are unique.`,
          `Ranked candidates by engagement score. Top pick: "${picked.text.substring(0, 40)}..."`,
          `Enriched with source: ${picked.source || 'N/A'}. Author verified: ${picked.author}.`,
          `Content block synthesized successfully using local generator.`,
          `Formatting validated. CTA and structure checks passed.`,
          `Adapted for target channels: Instagram, Twitter, LinkedIn.`,
          `Visual prompt generated. Color palette: warm earth tones.`,
        ];

        for (let i = 0; i < initialSteps.length; i++) {
          // Mark step as STARTED
          setPipelineSteps((prev) =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'STARTED', message: `Processing...` } : s)
          );
          addConsoleLog(`[${initialSteps[i].agent.toUpperCase()}] status: STARTED - Processing...`);
          await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));

          // Mark step as COMPLETED
          setPipelineSteps((prev) =>
            prev.map((s, idx) => idx === i ? { ...s, status: 'COMPLETED', message: simulatedMessages[i] } : s)
          );
          addConsoleLog(`[${initialSteps[i].agent.toUpperCase()}] status: COMPLETED - ${simulatedMessages[i]}`);
          await new Promise((r) => setTimeout(r, 150));
        }

        // Build the generated content item from the picked default quote
        const newItem: ContentItem = {
          id: `gen_${Date.now()}`,
          type: contentType,
          text: picked.text,
          author: picked.author,
          category: picked.category,
          source: picked.source,
          status: 'Unpublished',
          engagement: undefined,
        };

        setGeneratedItem(newItem);
        addConsoleLog(`SUCCESS: Sandbox simulation completed. Content ready for review!`);
        setFormSuccess("Sandbox Generation Completed!");
      } catch (err: any) {
        addConsoleLog(`ERROR: Sandbox simulation failed: ${err.message}`);
        setFormError(`Sandbox simulation error: ${err.message}`);
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    // ── Live Pipeline: call the backend API ──
    try {
      addConsoleLog(`Connecting to generation API...`);

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy,
          prompt: promptText,
          simulate: simulateMode
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${await response.text()}`);
      }

      const result = await response.json();

      if (!result.success) {
        const stepsFromServer = result.steps || [];
        for (let i = 0; i < stepsFromServer.length; i++) {
          const step = stepsFromServer[i];
          setPipelineSteps((prevSteps) => {
            return prevSteps.map((s) => {
              if (s.agent.toLowerCase() === step.agent.toLowerCase()) {
                return {
                  ...s,
                  status: step.status,
                  message: step.message,
                };
              }
              return s;
            });
          });
          addConsoleLog(`[${step.agent.toUpperCase()}] status: ${step.status} - ${step.message}`);
          await new Promise((r) => setTimeout(r, 200));
        }

        // Mark remaining agents as failed (aborted)
        setPipelineSteps((prevSteps) => {
          return prevSteps.map((s) => {
            if (s.status === 'PENDING' || s.status === 'STARTED') {
              return {
                ...s,
                status: 'FAILED',
                message: 'Aborted due to preceding pipeline error.'
              };
            }
            return s;
          });
        });

        throw new Error(result.error || 'Failed to execute pipeline.');
      }

      // We animate the steps sequence based on the server result steps
      const stepsFromServer = result.steps || [];

      for (let i = 0; i < stepsFromServer.length; i++) {
        const step = stepsFromServer[i];

        // Match step name to our initialSteps
        setPipelineSteps((prevSteps) => {
          return prevSteps.map((s) => {
            if (s.agent.toLowerCase() === step.agent.toLowerCase()) {
              return {
                ...s,
                status: step.status,
                message: step.message,
              };
            }
            return s;
          });
        });

        // Add console logs
        addConsoleLog(`[${step.agent.toUpperCase()}] status: ${step.status} - ${step.message}`);
        await new Promise((r) => setTimeout(r, 400));
      }

      if (result.simulated) {
        addConsoleLog(`WARNING: Gemini API free-tier limit hit or key missing. Seamlessly used premium fallback generator.`);
      }

      // Formulate the generated item
      const newItem: ContentItem = {
        id: `gen_${Date.now()}`,
        type: contentType,
        title: result.title || undefined,
        text: result.formatted_content?.instagram || result.formatted_content?.twitter || result.formatted_content?.linkedin || result.text || "",
        author: result.author || "AI Content Factory",
        category: result.category || "General",
        source: result.source || undefined,
        status: 'Unpublished',
        engagement: undefined
      };

      // Set the draft content details in state
      setGeneratedItem(newItem);
      addConsoleLog(`SUCCESS: Content generated successfully. Ready for review!`);
      setFormSuccess("Generation Completed!");
    } catch (err: any) {
      addConsoleLog(`ERROR: Pipeline execution aborted due to critical error: ${err.message}`);
      setFormError(`Generation failed: ${err.message}. Try switching to 'Sandbox Simulator' mode.`);

      setPipelineSteps((prev) => {
        let marked = false;
        return prev.map((s) => {
          if (!marked && (s.status === 'PENDING' || s.status === 'STARTED')) {
            marked = true;
            return { ...s, status: 'FAILED', message: err.message };
          }
          return s;
        });
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQueueContent = async () => {
    if (!generatedItem) return;

    // Save to the quotes repository via props callbacks
    const success = await onAddQuote({
      type: generatedItem.type,
      title: generatedItem.title,
      text: generatedItem.text,
      author: generatedItem.author,
      category: generatedItem.category,
      source: generatedItem.source
    });

    if (success) {
      setFormSuccess("Content queued for publishing! Redirecting...");
      setSelectedQuote(generatedItem);
      // Navigate to Publishing & Scheduling
      setTimeout(() => {
        onNavigateToTab('schedule');
      }, 800);
    } else {
      setFormError("DEDUPLICATION SAFETY TRIGGERED: Identical content is already in your repository.");
    }
  };

  const handleEditContentText = (id: string, newTxt: string) => {
    setGeneratedItem(prev => prev ? { ...prev, text: newTxt } : null);
  };

  return (
    <div id="content-generation-page" className="max-w-4xl mx-auto space-y-6">

      {/* Generator Controls */}
      <div className="bg-white dark:bg-brand-navy rounded-2xl border border-brand-gold/20 dark:border-brand-slate/40 p-6 shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-brand-gold/10">
          <Sparkles className="w-5 h-5 text-brand-terracotta" />
          <div>
            <h3 className="font-semibold text-brand-navy dark:text-brand-cream text-base font-display">Multi-Agent AI Generator</h3>
            <p className="text-[11px] text-brand-slate dark:text-brand-gold/70">Orchestrate a sequential team of specialized agents to generate content</p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-navy/80 dark:text-brand-gold mb-1.5">
                Target Format
              </label>
              <select
                id="generation-format-type"
                value={contentType}
                onChange={(e) => setContentType(e.target.value as ContentType)}
                className="w-full text-xs p-3 border border-brand-gold/25 dark:border-brand-slate/30 bg-white dark:bg-brand-midnight text-brand-navy dark:text-brand-cream rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-terracotta"
              >
                <option value="Quote">Daily Quote Card (Motivational/Philosophical)</option>
                <option value="instagram">Instagram Graphic Post (Aesthetic Caption)</option>
                <option value="Blog">Blog Post Article (Structured Markdown)</option>
                <option value="Social">Twitter/X Thread (Linked Hook & Sub-posts)</option>
                <option value="Script">Video Script (YouTube Shorts / Cues)</option>
                <option value="Newsletter">Weekly Email Newsletter (Rich formatting)</option>
              </select>
            </div>

            {/* Connection Mode Selection Toggle */}
            <div className="bg-brand-cream/40 dark:bg-brand-midnight/40 p-3 rounded-xl border border-brand-gold/15 dark:border-brand-slate/30 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-brand-navy/90 dark:text-brand-gold">Execution Mode</span>
                <p className="text-[10px] text-brand-slate/80 dark:text-brand-gold/60">Toggle local sandbox simulation</p>
              </div>

              <div className="flex items-center rounded-lg bg-white dark:bg-brand-navy p-1 shadow-inner border border-brand-gold/20">
                <button
                  type="button"
                  onClick={() => setSimulateMode(false)}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${!simulateMode ? 'bg-brand-slate text-white' : 'text-brand-slate'}`}
                >
                  Live Pipeline
                </button>
                <button
                  type="button"
                  id="toggle-simulation-mode"
                  onClick={() => setSimulateMode(true)}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${simulateMode ? 'bg-brand-slate text-white' : 'text-brand-slate'}`}
                >
                  Sandbox Simulator
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-brand-navy/80 dark:text-brand-gold mb-1.5">
              Prompt / Instructions <span className="text-[10px] text-brand-slate dark:text-brand-gold/60 font-normal">(Optional)</span>
            </label>
            <textarea
              id="generation-prompt-input"
              rows={3}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="Topic, tone, historical figure, target audience or specific instructions... (Leave blank for auto-generation)"
              className="w-full text-xs text-brand-navy dark:text-brand-cream/90 border border-brand-gold/25 dark:border-brand-slate/30 bg-white dark:bg-brand-midnight rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-brand-terracotta leading-relaxed"
            />
          </div>

          <button
            id="submit-generation-btn"
            type="submit"
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-terracotta hover:bg-brand-terracotta/90 disabled:bg-brand-slate/50 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-98 cursor-pointer animate-pulse"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Pipeline Agents...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Content Now</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Pipeline Progress Steps */}
      {pipelineSteps.length > 0 && (
        <div className="bg-white dark:bg-brand-navy rounded-2xl border border-brand-gold/20 dark:border-brand-slate/40 p-5 shadow-xs transition-colors">
          <h4 className="text-xs font-bold uppercase tracking-wider text-brand-navy/80 dark:text-brand-gold mb-4 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand-terracotta" /> Agent Pipeline Status Tracker
          </h4>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {pipelineSteps.map((step) => {
              const getStatusStyle = (status: string) => {
                switch (status) {
                  case 'COMPLETED':
                    return 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-emerald-300';
                  case 'STARTED':
                    return 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-300 animate-pulse';
                  case 'FAILED':
                    return 'bg-rose-100 dark:bg-rose-955/30 text-rose-800 dark:text-rose-400 border-rose-300';
                  case 'WARNING':
                    return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-300';
                  default:
                    return 'bg-brand-cream dark:bg-brand-midnight text-brand-slate dark:text-brand-slate border-brand-gold/15';
                }
              };

              return (
                <div
                  key={step.agent}
                  className={`p-2.5 rounded-xl border text-center transition-all ${getStatusStyle(step.status)}`}
                >
                  <span className="text-[10px] font-bold block">{step.agent}</span>
                  <span className="text-[8px] font-mono block mt-0.5 tracking-wider font-bold">
                    {step.status === 'PENDING' ? '⏳ PENDING' : step.status === 'STARTED' ? '🔄 ACTIVE' : step.status === 'WARNING' ? '⚠️ ADAPTED' : '✅ DONE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Console / Terminal logs */}
      {(consoleLogs.length > 0 || isGenerating) && (
        <div className="bg-brand-midnight text-neutral-300 rounded-2xl p-4 border border-brand-slate/60 shadow-md font-mono text-[10px] space-y-3">
          <div className="flex items-center justify-between border-b border-brand-slate/40 pb-2">
            <span className="flex items-center gap-1.5 text-brand-gold font-bold">
              <Terminal className="w-3.5 h-3.5 animate-pulse" /> Agent Output Stream
            </span>
            <span className="text-[9px] text-brand-slate">PORT 8000</span>
          </div>

          <div className="h-48 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-brand-slate">
            {consoleLogs.map((log, idx) => (
              <div key={idx} className="leading-normal whitespace-pre-wrap">
                {log.includes('[ERROR]') ? (
                  <span className="text-rose-400 font-semibold">{log}</span>
                ) : log.includes('[SUCCESS]') ? (
                  <span className="text-emerald-400 font-semibold">{log}</span>
                ) : log.includes('[WARNING]') ? (
                  <span className="text-amber-400 font-semibold">{log}</span>
                ) : (
                  log
                )}
              </div>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      )}

      {/* Errors / Success Banners */}
      {formError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-955/20 text-rose-800 dark:text-rose-400 border-l-4 border-rose-600 rounded-r-xl text-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-l-4 border-emerald-600 rounded-r-xl text-xs flex items-start gap-2.5 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Preview and Queue */}
      {generatedItem && (
        <div className="space-y-4 animate-fadeIn">
          <SocialPreview quote={generatedItem} onEditQuoteText={handleEditContentText} />

          <div className="bg-white dark:bg-brand-navy p-5 rounded-2xl border border-brand-gold/25 dark:border-brand-slate/40 flex justify-end">
            <button
              id="publish-navigation-btn"
              onClick={handleQueueContent}
              className="px-6 py-3 bg-brand-terracotta hover:bg-brand-terracotta/90 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <span>Publish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
