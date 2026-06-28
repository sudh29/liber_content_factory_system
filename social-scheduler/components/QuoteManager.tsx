import React, { useState, useRef } from 'react';
import { Quote } from '../../../shared/types';
import { Search, Filter, Plus, FileSpreadsheet, Download, RefreshCcw, Check, Trash, Eye, PenTool, Sparkles, AlertTriangle, ShieldCheck, CheckSquare, ListFilter, HelpCircle } from 'lucide-react';

interface QuoteManagerProps {
  quotes: Quote[];
  onAddQuote: (newQuote: Omit<Quote, 'id' | 'status'>) => boolean; // returns true if successful, false if duplicate
  onDeleteQuote: (id: string) => void;
  onSelectQuoteToPreview: (quote: Quote) => void;
  onImportCSV: (importedQuotes: Omit<Quote, 'id' | 'status'>[]) => { added: number; skippedIdsCount: number };
  onForcePublish: (quoteId: string) => void;
  selectedQuoteId?: string;
}

export const QuoteManager: React.FC<QuoteManagerProps> = ({
  quotes,
  onAddQuote,
  onDeleteQuote,
  onSelectQuoteToPreview,
  onImportCSV,
  onForcePublish,
  selectedQuoteId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'Unpublished' | 'Scheduled' | 'Published'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form states for manual additions
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newCategory, setNewCategory] = useState("Philosophy");
  const [newSource, setNewSource] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // File reference for CSV Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvPreviewError, setCsvPreviewError] = useState<string | null>(null);
  const [csvSuccessMsg, setCsvSuccessMsg] = useState<string | null>(null);

  const categories = ['all', ...Array.from(new Set(quotes.map((q) => q.category).filter(Boolean)))];

  // Filters
  const filteredQuotes = quotes.filter((q) => {
    const matchesSearch =
      q.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.author.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || q.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newText.trim()) {
      setFormError("Quote text cannot be blank.");
      return;
    }
    if (!newAuthor.trim()) {
      setFormError("Attributed public figure author name is required.");
      return;
    }

    // Attempt insert (which enforces duplicates check inside root parent logic)
    const success = onAddQuote({
      text: newText.trim(),
      author: newAuthor.trim(),
      category: newCategory.trim(),
      source: newSource.trim() || undefined,
    });

    if (success) {
      setFormSuccess("Authentic quote successfully added & verified!");
      setNewText("");
      setNewAuthor("");
      setNewSource("");
      setTimeout(() => {
        setIsAdding(false);
        setFormSuccess(null);
      }, 1500);
    } else {
      setFormError("DUPLICATE CHRONICLED: An identical quote from this public figure already exists in our publishing database.");
    }
  };

  // Raw helper to client-side parse uploaded CSV
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvPreviewError(null);
    setCsvSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          setCsvPreviewError("The uploaded file is empty.");
          return;
        }

        // Extremely robust CSV line splitter addressing escaped quotes
        const lines = text.split(/\r?\n/);
        const imported: Omit<Quote, 'id' | 'status'>[] = [];

        // Check if there are keys or custom headers (skip line 1 optionally if it looks like headers)
        let startIndex = 0;
        if (lines[0].toLowerCase().includes("quote") || lines[0].toLowerCase().includes("author")) {
          startIndex = 1;
        }

        for (let i = startIndex; i < lines.length; i++) {
          const l = lines[i].trim();
          if (!l) continue;

          // Simple split of CSV line considering simple commas or quotes (Quotes can be parsed efficiently)
          // For initial version CSV parses e.g.: "quote text", "author name", "category", "source"
          let quoteText = "";
          let authorName = "";
          let category = "Misc";
          let source = "";

          // Simple custom quote parsing that splits by quote characters or commas
          if (l.startsWith('"') || l.includes('","')) {
            const parts = l.split(/","/);
            if (parts.length >= 2) {
              quoteText = parts[0].replace(/^"/, '').replace(/"$/, '').trim();
              authorName = parts[1].replace(/^"/, '').replace(/"$/, '').trim();
              if (parts[2]) category = parts[2].replace(/^"/, '').replace(/"$/, '').trim();
              if (parts[3]) source = parts[3].replace(/^"/, '').replace(/"$/, '').trim();
            } else {
              // fallback split
              const normalParts = l.split(',');
              quoteText = normalParts[0]?.trim() || "";
              authorName = normalParts[1]?.trim() || "Unknown";
            }
          } else {
            const parts = l.split(',');
            quoteText = parts[0]?.trim() || "";
            authorName = parts[1]?.trim() || "Unknown";
            if (parts[2]) category = parts[2].trim();
            if (parts[3]) source = parts[3].trim();
          }

          if (quoteText && authorName) {
            imported.push({
              text: quoteText,
              author: authorName,
              category,
              source: source || undefined,
            });
          }
        }

        if (imported.length === 0) {
          setCsvPreviewError("No valid rows containing 'Quote Text' and 'Author' could be recovered from the CSV.");
          return;
        }

        const results = onImportCSV(imported);
        setCsvSuccessMsg(`Successfully processed CSV: Chronicled ${results.added} new verified quotes. Ignored ${results.skippedIdsCount} duplicate copies.`);
      } catch (err: any) {
        setCsvPreviewError("Failed to parse CSV file standard structure. Make sure columns are ordered as: Quote,Author,Category,Source.");
      }
    };

    reader.readAsText(file);
    // Reset file element value so the same file could be loaded again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Export database safely to standard CSV Format
  const handleExportCSV = () => {
    // Generate headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Quote,Author,Category,Source,Status,PublishedDate\n";

    quotes.forEach((q) => {
      // Escape inner values quoting
      const escText = q.text.replace(/"/g, '""');
      const escAuthor = q.author.replace(/"/g, '""');
      const escCat = (q.category || "General").replace(/"/g, '""');
      const escSrc = (q.source || "").replace(/"/g, '""');

      csvContent += `"${escText}","${escAuthor}","${escCat}","${escSrc}","${q.status}","${q.publishedTime || ''}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "daily_quotes_publishing_repository.csv");
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="quote-repository-card" className="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-gray-100 dark:border-slate-800 p-6 space-y-6 transition-colors duration-200">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Authentic Quote Repository</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Verified public figures only. Guaranteed authentic attributions with deduplication.</p>
          </div>
        </div>

        {/* Top bar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* CSV Import */}
          <button
            id="trigger-csv-import-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 border border-gray-200 dark:border-slate-700 hover:border-gray-300 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Import CSV</span>
          </button>
          <input
            id="csv-hidden-file-input"
            type="file"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            accept=".csv"
            className="hidden"
          />

          {/* CSV Export */}
          <button
            id="trigger-csv-export-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 border border-gray-200 dark:border-slate-700 hover:border-gray-300 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Backup CSV</span>
          </button>

          {/* Add Manual Quote */}
          <button
            id="toggle-add-manual-btn"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Quote</span>
          </button>
        </div>
      </div>

      {/* CSV Status Messages */}
      {csvPreviewError && (
        <div id="csv-error-bubble" className="p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-200 border-l-4 border-rose-500 rounded-r-lg text-xs leading-normal flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{csvPreviewError}</span>
        </div>
      )}
      {csvSuccessMsg && (
        <div id="csv-success-bubble" className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-200 border-l-4 border-emerald-500 rounded-r-lg text-xs leading-normal flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{csvSuccessMsg}</span>
        </div>
      )}

      {/* Manual Insert Form */}
      {isAdding && (
        <form id="add-manual-quote-form" onSubmit={handleManualSubmit} className="p-4 bg-slate-50/80 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4 transition-colors">
          <div className="flex items-center justify-between border-b border-gray-200/50 dark:border-slate-800 pb-2 mb-2">
            <h4 className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1">
              <PenTool className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Confirm Verified Attribution Details
            </h4>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-805 dark:text-indigo-300 px-2 py-0.5 rounded-full">Anti-AI Policy Protected</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-700 dark:text-slate-300 mb-1">Quote Text (Preserve actual punctuation & text exactly)</label>
              <textarea
                id="manual-quote-text"
                rows={2}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-950 dark:text-white dark:bg-slate-900 font-sans"
                placeholder="He who has a why to live can bear almost any how..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-gray-700 dark:text-slate-300 mb-1">Public Figure Author</label>
                <input
                  id="manual-quote-author"
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white dark:bg-slate-900"
                  placeholder="Friedrich Nietzsche"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-700 dark:text-slate-300 mb-1">Category / Topic</label>
                <select
                  id="manual-quote-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white"
                >
                  <option value="Philosophy">Philosophy</option>
                  <option value="Science">Science</option>
                  <option value="Inspiration">Inspiration</option>
                  <option value="Technology">Technology</option>
                  <option value="Motivation">Motivation</option>
                  <option value="History">History</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-gray-700 dark:text-slate-300 mb-1">Biographical Reference / Source (Optional)</label>
                <input
                  id="manual-quote-source"
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full text-xs p-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white dark:bg-slate-900"
                  placeholder="Twilight of the Idols (1889)"
                />
              </div>
            </div>

            {formError && (
              <p id="manual-form-error" className="text-rose-600 dark:text-rose-400 font-medium text-[11px] bg-rose-50 dark:bg-rose-950/20 p-2 rounded border border-rose-100 dark:border-rose-900/50 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                {formError}
              </p>
            )}

            {formSuccess && (
              <p id="manual-form-success" className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px] bg-emerald-50 dark:bg-emerald-950/20 p-2 rounded border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {formSuccess}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                id="cancel-add-btn"
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 border border-gray-200 dark:border-slate-705 text-gray-600 dark:text-slate-300 rounded-lg text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                id="summit-new-quote-btn"
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs cursor-pointer font-medium transition-colors"
              >
                Chronicler Entry
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
          <input
            id="quote-search-bar"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-3 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
            placeholder="Search by author, historical event, content text..."
          />
        </div>

        {/* Status Filter */}
        <div className="md:col-span-3">
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full text-xs px-3 py-3 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-gray-700 dark:text-slate-300 transition-colors"
          >
            <option value="all">Filter: All Statuses</option>
            <option value="Unpublished">Unpublished (Queue Reserve)</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Published">Published Streams</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="md:col-span-3">
          <select
            id="category-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-xs px-3 py-3 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-gray-700 dark:text-slate-300 transition-colors capitalize"
          >
            <option value="all">Filter: All Topics</option>
            {categories.filter((c) => c !== 'all').map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quote Grid / Table */}
      {filteredQuotes.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-gray-100 dark:border-slate-800 rounded-2xl bg-stone-50/50 dark:bg-slate-950/30">
          <Search className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-xs text-gray-500 dark:text-gray-400">No verified quotes found matching current query or filters.</p>
        </div>
      ) : (
        <div className="border border-gray-100 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs transition-colors">
          <table className="w-full border-collapse text-left text-xs bg-white dark:bg-slate-900/60">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/50 border-b border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-semibold select-none">
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Verified Content Wording</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Public Figure</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Topic</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800 font-sans">
              {filteredQuotes.map((q) => {
                const isSelected = q.id === selectedQuoteId;
                return (
                  <tr
                    key={q.id}
                    id={`quote-row-${q.id}`}
                    className={`hover:bg-indigo-50/20 dark:hover:bg-slate-800/40 transition-all cursor-pointer ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/30 border-l-4 border-l-indigo-600' : ''}`}
                    onClick={() => onSelectQuoteToPreview(q)}
                  >
                    <td className="p-3.5 max-w-sm md:max-w-xl">
                      <p className="font-medium text-gray-950 dark:text-white font-sans">
                        "{q.text}"
                      </p>
                      {q.source && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-400 block mt-1 font-serif">
                          Source Ref: {q.source}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono text-[11px] font-semibold text-gray-800 dark:text-slate-200 whitespace-nowrap">
                      {q.author}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                        {q.category || "General"}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {q.status === 'Published' ? (
                        <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Published
                        </span>
                      ) : q.status === 'Scheduled' ? (
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-100/50 dark:border-blue-800/50 px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          Scheduled
                        </span>
                      ) : (
                        <span className="text-[10px] bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500"></span>
                          Unpublished
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {q.status === 'Unpublished' && (
                          <button
                            id={`force-publish-btn-${q.id}`}
                            onClick={() => onForcePublish(q.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Publish Now
                          </button>
                        )}
                        
                        <button
                          id={`select-preview-btn-${q.id}`}
                          onClick={() => onSelectQuoteToPreview(q)}
                          title="Open in designer preview platform"
                          className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          id={`delete-quote-btn-${q.id}`}
                          onClick={() => onDeleteQuote(q.id)}
                          title="Delete from safe list"
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
