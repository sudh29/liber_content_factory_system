import { useState, useEffect } from 'react';
import { Quote } from '../types';
import { DEFAULT_QUOTES } from '../data/defaultContent';
import { isDuplicateQuote } from '../utils/dedup';

export function useContent() {
  const [quotes, setQuotesState] = useState<Quote[]>([]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      if (!res.ok) throw new Error("API failed");
      const payload = await res.json();
      // Backend returns { quotes: [...] } while local code expects an array.
      const data = Array.isArray(payload) ? payload : (Array.isArray(payload.quotes) ? payload.quotes : []);
      setQuotesState(data as Quote[]);
      localStorage.setItem('quotes_repository', JSON.stringify(data));
    } catch (err) {
      console.warn("Backend API offline/error. Loading from localStorage cache.");
      try {
        const storedQuotes = localStorage.getItem('quotes_repository');
        if (storedQuotes) {
          let parsed = JSON.parse(storedQuotes) as Quote[];
          let hasChanges = false;
          const countBefore = parsed.length;
          parsed = parsed.filter(q => q.id !== "q1" && !q.text.includes("realization of tomorrow"));
          if (parsed.length !== countBefore) {
            hasChanges = true;
          }
          parsed = parsed.map(q => {
            if (q.source === "Meditations, Book X") {
              hasChanges = true;
              return { ...q, source: "" };
            }
            return q;
          });
          setQuotesState(parsed);
          if (hasChanges) {
            localStorage.setItem('quotes_repository', JSON.stringify(parsed));
          }
        } else {
          setQuotesState(DEFAULT_QUOTES);
          localStorage.setItem('quotes_repository', JSON.stringify(DEFAULT_QUOTES));
        }
      } catch (e) {
        console.error("Local storage load error", e);
      }
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const setQuotes = (updatedQuotes: Quote[]) => {
    setQuotesState(updatedQuotes);
    localStorage.setItem('quotes_repository', JSON.stringify(updatedQuotes));
    
    // Bulk write is not directly exposed as POST, but saving each handles it, or we just write to local cache and wait for individual updates.
    // In practice, useContent only calls setQuotes internally when initializing or resetting, so local cache is correct.
  };

  const addQuote = async (newQuoteData: Omit<Quote, 'id' | 'status'>): Promise<{ success: boolean; isDuplicate: boolean; quote?: Quote }> => {
    const normalizedNewText = newQuoteData.text.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = quotes.find(
      (q) => q.text.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedNewText
    );
    if (existing) {
      return { success: true, isDuplicate: false, quote: existing };
    }
    const newQuote: Quote = {
      id: `q_${Date.now()}`,
      ...newQuoteData,
      status: 'Unpublished',
    };
    
    // Persist to backend first so the quote exists server-side before publish
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote)
      });
      if (res.ok) {
        const saved = await res.json();
        // Use server-confirmed quote (may have server-assigned ID)
        if (saved.quote) {
          const confirmedQuote: Quote = saved.quote;
          const updated = [confirmedQuote, ...quotes];
          setQuotesState(updated);
          localStorage.setItem('quotes_repository', JSON.stringify(updated));
          return { success: true, isDuplicate: false, quote: confirmedQuote };
        }
      }
    } catch (err) {
      console.warn("Backend save failed, falling back to local-only:", err);
    }

    // Fallback: update local state only (backend offline)
    const updated = [newQuote, ...quotes];
    setQuotesState(updated);
    localStorage.setItem('quotes_repository', JSON.stringify(updated));
    return { success: true, isDuplicate: false, quote: newQuote };
  };

  const deleteQuote = (id: string): Quote | undefined => {
    const q = quotes.find((x) => x.id === id);
    const updated = quotes.filter((x) => x.id !== id);
    setQuotesState(updated);
    localStorage.setItem('quotes_repository', JSON.stringify(updated));

    // Send DELETE to backend server
    fetch(`/api/quotes/${id}`, {
      method: 'DELETE'
    }).catch(err => console.error("Failed to delete quote from backend:", err));

    return q;
  };

  const scheduleQuote = (id: string, timeStr: string, platforms?: string[]) => {
    const updated = quotes.map((q) => {
      if (q.id === id) {
        const item = {
          ...q,
          status: 'Scheduled' as const,
          scheduledTime: timeStr,
          scheduledPlatforms: platforms,
        };
        // Persist to backend
        fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        }).catch(err => console.error("Failed to schedule quote on backend:", err));
        return item;
      }
      return q;
    });
    setQuotesState(updated);
    localStorage.setItem('quotes_repository', JSON.stringify(updated));
  };

  const updateQuoteText = (id: string, text: string) => {
    const updated = quotes.map((q) => {
      if (q.id === id) {
        const item = { ...q, text };
        // Persist to backend
        fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        }).catch(err => console.error("Failed to update quote text on backend:", err));
        return item;
      }
      return q;
    });
    setQuotesState(updated);
    localStorage.setItem('quotes_repository', JSON.stringify(updated));
  };

  return {
    quotes,
    setQuotes,
    addQuote,
    deleteQuote,
    scheduleQuote,
    updateQuoteText,
  };
}
