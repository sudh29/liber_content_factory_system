import React, { useState, useRef } from 'react';
import { ContentItem, ContentType } from '../../shared/types';
import { Search, Plus, FileSpreadsheet, Download, Check, Trash, Eye, PenTool, AlertTriangle, ShieldCheck, ListFilter } from 'lucide-react';

interface QuoteManagerProps {
  quotes: ContentItem[]; // Generalized state array of items
  onAddQuote: (newQuote: Omit<ContentItem, 'id' | 'status'>) => boolean;
  onDeleteQuote: (id: string) => void;
  onSelectQuoteToPreview: (quote: ContentItem) => void;
  onImportCSV: (importedQuotes: Omit<ContentItem, 'id' | 'status'>[]) => { added: number; skippedIdsCount: number };
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
  const [typeFilter, setTypeFilter] = useState<'all' | ContentType>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Form states for manual additions
  const [isAdding, setIsAdding] = useState(false);
  const [newType, setNewType] = useState<ContentType>("Quote");
  const [newTitle, setNewTitle] = useState("");
  const [newText, setNewText] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newCategory, setNewCategory] = useState("Technology");
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
      q.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.title && q.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || q.status === statusFilter;
    const matchesType = typeFilter === 'all' || q.type === typeFilter;
    const matchesCategory = categoryFilter === 'all' || q.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesType && matchesCategory;
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newText.trim()) {
      setFormError("Content text cannot be blank.");
      return;
    }
    if (!newAuthor.trim()) {
      setFormError("Author/Attribution is required.");
      return;
    }

    // Attempt insert (which enforces duplicates check inside root parent logic)
    const success = onAddQuote({
      type: newType,
      title: newTitle.trim() || undefined,
      text: newText.trim(),
      author: newAuthor.trim(),
      category: newCategory.trim(),
      source: newSource.trim() || undefined,
    });

    if (success) {
      setFormSuccess("Content successfully added!");
      setNewText("");
      setNewTitle("");
      setNewAuthor("");
      setNewSource("");
      setTimeout(() => {
        setIsAdding(false);
        setFormSuccess(null);
      }, 1500);
    } else {
      setFormError("DUPLICATE BLOCKED: An identical content record already exists.");
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

        const lines = text.split(/\r?\n/);
        const imported: Omit<ContentItem, 'id' | 'status'>[] = [];

        let startIndex = 0;
        if (lines[0].toLowerCase().includes("quote") || lines[0].toLowerCase().includes("text")) {
          startIndex = 1;
        }

        for (let i = startIndex; i < lines.length; i++) {
          const l = lines[i].trim();
          if (!l) continue;

          let quoteText = "";
          let authorName = "";
          let category = "Misc";
          let source = "";

          if (l.startsWith('"') || l.includes('","')) {
            const parts = l.split(/","/);
            if (parts.length >= 2) {
              quoteText = parts[0].replace(/^"/, '').replace(/"$/, '').trim();
              authorName = parts[1].replace(/^"/, '').replace(/"$/, '').trim();
              if (parts[2]) category = parts[2].replace(/^"/, '').replace(/"$/, '').trim();
              if (parts[3]) source = parts[3].replace(/^"/, '').replace(/"$/, '').trim();
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
              type: 'Quote',
              text: quoteText,
              author: authorName,
              category,
              source: source || undefined,
            });
          }
        }

        if (imported.length === 0) {
          setCsvPreviewError("No valid rows could be recovered.");
          return;
        }

        const results = onImportCSV(imported);
        setCsvSuccessMsg(`Processed CSV: Imported ${results.added} items. Filtered ${results.skippedIdsCount} duplicates.`);
      } catch (err: any) {
        setCsvPreviewError("Failed to parse CSV file standard structure.");
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Type,Title,Content,Author,Category,Source,Status\n";

    quotes.forEach((q) => {
      const escText = q.text.replace(/"/g, '""');
      const escAuthor = q.author.replace(/"/g, '""');
      const escTitle = (q.title || "").replace(/"/g, '""');
      const escCat = (q.category || "General").replace(/"/g, '""');
      const escSrc = (q.source || "").replace(/"/g, '""');

      csvContent += `"${q.type}","${escTitle}","${escText}","${escAuthor}","${escCat}","${escSrc}","${q.status}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ai_content_factory_repository.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="quote-repository-card" className="bg-white dark:bg-brand-navy rounded-2xl shadow-xs border border-brand-gold/20 dark:border-brand-slate/40 p-6 space-y-6 transition-colors duration-200">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-gold/15 dark:border-brand-slate/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-brand-slate/10 dark:bg-brand-navy/40 text-brand-slate dark:text-brand-gold rounded-xl">
            <ListFilter className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy dark:text-brand-cream text-lg">Universal Content Repository</h3>
            <p className="text-xs text-brand-slate dark:text-brand-slate/80 mt-0.5">Manage multiple AI content formats (Blogs, Social Threads, Quotes, Newsletters).</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="trigger-csv-import-btn"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 border border-brand-gold/25 dark:border-brand-slate/30 hover:border-brand-gold/40 text-brand-navy/80 dark:text-brand-gold hover:bg-brand-cream/80 dark:hover:bg-brand-midnight/60 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-brand-terracotta dark:text-brand-terracotta" />
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

          <button
            id="trigger-csv-export-btn"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 border border-brand-gold/25 dark:border-brand-slate/30 hover:border-brand-gold/40 text-brand-navy/80 dark:text-brand-gold hover:bg-brand-cream/80 dark:hover:bg-brand-midnight/60 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-brand-slate dark:text-brand-gold" />
            <span>Backup CSV</span>
          </button>

          <button
            id="toggle-add-manual-btn"
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-1.5 bg-brand-slate hover:bg-brand-slate text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer select-none transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Content</span>
          </button>
        </div>
      </div>

      {/* CSV Status Messages */}
      {csvPreviewError && (
        <div id="csv-error-bubble" className="p-3.5 bg-brand-terracotta/10 dark:bg-brand-navy/20 text-brand-terracotta dark:text-brand-terracotta/60 border-l-4 border-rose-500 rounded-r-lg text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-brand-terracotta shrink-0 mt-0.5" />
          <span>{csvPreviewError}</span>
        </div>
      )}
      {csvSuccessMsg && (
        <div id="csv-success-bubble" className="p-3.5 bg-brand-terracotta/10 dark:bg-brand-navy/20 text-brand-terracotta dark:text-brand-terracotta/60 border-l-4 border-emerald-500 rounded-r-lg text-xs flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-terracotta shrink-0 mt-0.5" />
          <span>{csvSuccessMsg}</span>
        </div>
      )}

      {/* Manual Insert Form */}
      {isAdding && (
        <form id="add-manual-quote-form" onSubmit={handleManualSubmit} className="p-4 bg-brand-cream/60/80 dark:bg-brand-midnight/40 rounded-xl border border-brand-gold/20 dark:border-brand-slate/40 space-y-4">
          <div className="flex items-center justify-between border-b border-brand-gold/25/50 dark:border-brand-slate/40 pb-2 mb-2">
            <h4 className="text-xs font-bold text-brand-navy/80 dark:text-brand-gold/70 uppercase tracking-widest flex items-center gap-1">
              <PenTool className="w-3.5 h-3.5 text-brand-slate dark:text-brand-gold" /> Create Content Record
            </h4>
            <span className="text-[10px] bg-brand-slate/10 dark:bg-brand-navy/50 text-brand-slate dark:text-brand-gold px-2 py-0.5 rounded-full">Format Safeguarded</span>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-brand-navy/80 dark:text-brand-gold mb-1">Content Format Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as ContentType)}
                  className="w-full text-xs p-2 border border-brand-gold/25 dark:border-brand-slate/30 bg-white dark:bg-brand-navy rounded-lg focus:outline-none text-brand-navy dark:text-brand-cream"
                >
                  <option value="Quote">Quote (Graphic / Text)</option>
                  <option value="Blog">Blog Article (Markdown)</option>
                  <option value="Social">Social Thread / Hook (Twitter/LinkedIn)</option>
                  <option value="Newsletter">Newsletter (Markdown Email)</option>
                  <option value="Script">Video Script (Shorts / YouTube)</option>
                </select>
              </div>

              {(newType === 'Blog' || newType === 'Newsletter' || newType === 'Script') && (
                <div>
                  <label className="block text-[10px] font-semibold text-brand-navy/80 dark:text-brand-gold mb-1">Title / Headline</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full text-xs p-2 border border-brand-gold/25 dark:border-brand-slate/30 rounded-lg focus:outline-none text-brand-navy dark:text-brand-cream dark:bg-brand-navy"
                    placeholder="Enter headline..."
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-brand-navy/80 dark:text-brand-gold mb-1">Content Body / Text</label>
              <textarea
                id="manual-quote-text"
                rows={newType === 'Quote' ? 2 : 5}
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="w-full text-xs p-2.5 border border-brand-gold/25 dark:border-brand-slate/30 rounded-lg focus:outline-none text-brand-navy dark:text-brand-cream dark:bg-brand-navy font-display"
                placeholder={newType === 'Quote' ? "He who has a why to live can bear almost any how..." : "# Subheading\n\nEnter rich markdown content here..."}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-brand-navy/80 dark:text-brand-gold mb-1">Attribution / Author</label>
                <input
                  id="manual-quote-author"
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full text-xs p-2 border border-brand-gold/25 dark:border-brand-slate/30 rounded-lg focus:outline-none text-brand-navy dark:text-brand-cream dark:bg-brand-navy"
                  placeholder="Friedrich Nietzsche"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-brand-navy/80 dark:text-brand-gold mb-1">Category / Topic</label>
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full text-xs p-2 border border-brand-gold/25 dark:border-brand-slate/30 bg-white dark:bg-brand-navy rounded-lg focus:outline-none text-brand-navy dark:text-brand-cream"
                  placeholder="Philosophy"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-brand-navy/80 dark:text-brand-gold mb-1">Source / Citation (Optional)</label>
                <input
                  id="manual-quote-source"
                  type="text"
                  value={newSource}
                  onChange={(e) => setNewSource(e.target.value)}
                  className="w-full text-xs p-2 border border-brand-gold/25 dark:border-brand-slate/30 rounded-lg focus:outline-none text-brand-navy dark:text-brand-cream dark:bg-brand-navy"
                  placeholder="Twilight of the Idols (1889)"
                />
              </div>
            </div>

            {formError && (
              <p id="manual-form-error" className="text-brand-terracotta dark:text-brand-terracotta font-medium text-[11px] bg-brand-terracotta/10 dark:bg-brand-navy/20 p-2 rounded border border-rose-100 dark:border-rose-900/50 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-brand-terracotta shrink-0" />
                {formError}
              </p>
            )}

            {formSuccess && (
              <p id="manual-form-success" className="text-brand-terracotta dark:text-brand-terracotta font-medium text-[11px] bg-brand-terracotta/10 dark:bg-brand-navy/20 p-2 rounded border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-brand-terracotta shrink-0" />
                {formSuccess}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                id="cancel-add-btn"
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3.5 py-1.5 border border-brand-gold/25 dark:border-brand-slate/30 text-brand-navy/70 dark:text-brand-gold rounded-lg text-xs cursor-pointer hover:bg-brand-cream dark:hover:bg-brand-midnight/60 font-medium"
              >
                Cancel
              </button>
              <button
                id="summit-new-quote-btn"
                type="submit"
                className="px-4 py-1.5 bg-brand-slate hover:bg-brand-slate text-white rounded-lg text-xs cursor-pointer font-medium"
              >
                Save Content
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-brand-slate/80 absolute left-3 top-3.5" />
          <input
            id="quote-search-bar"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-3 border border-brand-gold/25 dark:border-brand-slate/30 bg-white dark:bg-brand-navy text-brand-navy dark:text-brand-cream rounded-xl focus:outline-none transition-colors"
            placeholder="Search by text, author, title..."
          />
        </div>

        {/* Content Type Filter */}
        <div className="md:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="w-full text-xs px-3 py-3 border border-brand-gold/25 dark:border-brand-slate/30 bg-white dark:bg-brand-navy rounded-xl focus:outline-none cursor-pointer text-brand-navy/80 dark:text-brand-gold transition-colors"
          >
            <option value="all">Filter: All Formats</option>
            <option value="Quote">Quotes</option>
            <option value="Blog">Blog Articles</option>
            <option value="Social">Social Posts</option>
            <option value="Newsletter">Newsletters</option>
            <option value="Script">Video Scripts</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="md:col-span-2">
          <select
            id="status-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full text-xs px-3 py-3 border border-brand-gold/25 dark:border-brand-slate/30 bg-white dark:bg-brand-navy rounded-xl focus:outline-none cursor-pointer text-brand-navy/80 dark:text-brand-gold transition-colors"
          >
            <option value="all">All Statuses</option>
            <option value="Unpublished">Unpublished</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Published">Published</option>
          </select>
        </div>

        {/* Category Filter */}
        <div className="md:col-span-3">
          <select
            id="category-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full text-xs px-3 py-3 border border-brand-gold/25 dark:border-brand-slate/30 bg-white dark:bg-brand-navy rounded-xl focus:outline-none cursor-pointer text-brand-navy/80 dark:text-brand-gold transition-colors capitalize"
          >
            <option value="all">All Topics</option>
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
        <div className="text-center py-12 border border-dashed border-brand-gold/20 dark:border-brand-slate/40 rounded-2xl bg-stone-50/50 dark:bg-brand-midnight/30">
          <Search className="w-8 h-8 text-brand-gold/60 dark:text-brand-navy/70 mx-auto mb-2" />
          <p className="text-xs text-brand-slate dark:text-brand-slate/80">No content records found matching filters.</p>
        </div>
      ) : (
        <div className="border border-brand-gold/20 dark:border-brand-slate/40 rounded-xl overflow-hidden shadow-2xs transition-colors">
          <table className="w-full border-collapse text-left text-xs bg-white dark:bg-brand-navy/60">
            <thead>
              <tr className="bg-brand-cream/60 dark:bg-brand-midnight/50 border-b border-brand-gold/20 dark:border-brand-slate/40 text-brand-slate dark:text-brand-slate/80 font-semibold select-none">
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Title & Preview</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Format</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Author / Attrib</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Topic</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {filteredQuotes.map((q) => {
                const isSelected = q.id === selectedQuoteId;
                return (
                  <tr
                    key={q.id}
                    id={`quote-row-${q.id}`}
                    className={`hover:bg-brand-slate/10/20 dark:hover:bg-brand-midnight/60/40 transition-all cursor-pointer ${isSelected ? 'bg-brand-slate/10/40 dark:bg-brand-navy/30 border-l-4 border-l-indigo-600' : ''}`}
                    onClick={() => onSelectQuoteToPreview(q)}
                  >
                    <td className="p-3.5 max-w-sm md:max-w-xl">
                      {q.title && (
                        <p className="font-bold text-brand-navy dark:text-brand-cream text-xs mb-1">
                          {q.title}
                        </p>
                      )}
                      <p className="font-medium text-brand-navy dark:text-brand-gold/60 font-display truncate">
                        {q.text}
                      </p>
                      {q.source && (
                        <span className="text-[10px] text-brand-slate/80 dark:text-brand-slate block mt-1 font-serif">
                          Source: {q.source}
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="text-[10px] bg-brand-cream dark:bg-brand-midnight text-brand-navy/80 dark:text-brand-gold/70 px-2.5 py-0.5 rounded-full font-bold">
                        {q.type}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] font-semibold text-brand-navy dark:text-brand-cream/90 whitespace-nowrap">
                      {q.author}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="text-[10px] bg-brand-slate/10 dark:bg-brand-navy/50 text-brand-slate dark:text-brand-gold px-2 py-0.5 rounded-full font-semibold">
                        {q.category || "General"}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {q.status === 'Published' ? (
                        <span className="text-[10px] bg-brand-terracotta/10 dark:bg-brand-navy/40 text-brand-terracotta dark:text-brand-terracotta/80 border border-emerald-100/50 dark:border-emerald-800/50 px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-terracotta"></span>
                          Published
                        </span>
                      ) : q.status === 'Scheduled' ? (
                        <span className="text-[10px] bg-brand-slate/10 dark:bg-brand-navy/40 text-brand-slate dark:text-brand-gold border border-blue-100/50 dark:border-blue-800/50 px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-slate/100"></span>
                          Scheduled
                        </span>
                      ) : (
                        <span className="text-[10px] bg-brand-cream dark:bg-brand-midnight text-brand-navy/80 dark:text-brand-gold px-2.5 py-0.5 rounded-full font-semibold inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-slate/60 dark:bg-brand-gold/60"></span>
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
                            className="bg-brand-terracotta hover:bg-brand-terracotta/80 text-white font-semibold text-[10px] px-2 py-1 rounded transition-colors cursor-pointer"
                          >
                            Publish
                          </button>
                        )}
                        
                        <button
                          id={`select-preview-btn-${q.id}`}
                          onClick={() => onSelectQuoteToPreview(q)}
                          className="p-1 text-brand-slate/80 hover:text-brand-slate hover:bg-brand-slate/10/50 dark:hover:bg-brand-midnight/60 rounded transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button
                          id={`delete-quote-btn-${q.id}`}
                          onClick={() => onDeleteQuote(q.id)}
                          className="p-1 text-brand-slate/80 hover:text-brand-terracotta hover:bg-brand-terracotta/10 dark:hover:bg-brand-midnight/60 rounded transition-colors cursor-pointer"
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
