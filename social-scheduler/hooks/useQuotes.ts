import { useState, useEffect } from 'react';
import { Quote } from '../../shared/types';
import { DEFAULT_QUOTES } from '../../shared/data/defaultQuotes';
import { isDuplicateQuote } from '../../shared/utils/dedup';

export function useQuotes() {
  const [quotes, setQuotesState] = useState<Quote[]>([]);

  const fetchQuotes = async () => {
    try {
      const res = await fetch('/api/quotes');
      if (!res.ok) throw new Error("API failed");
      const data = await res.json() as Quote[];
      setQuotesState(data);
      localStorage.setItem('quotes_repository', JSON.stringify(data));
    } catch (err) {
      console.warn("Backend API offline/error. Loading from localStorage cache.");
      try {
        const storedQuotes = localStorage.getItem('quotes_repository');
        if (storedQuotes) {
          let parsed = JSON.parse(storedQuotes) as Quote[];
          let hasChanges = false;
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
    // In practice, useQuotes only calls setQuotes internally when initializing or resetting, so local cache is correct.
  };

  const addQuote = (newQuoteData: Omit<Quote, 'id' | 'status'>): { success: boolean; isDuplicate: boolean; quote?: Quote } => {
    if (isDuplicateQuote(quotes, newQuoteData.text)) {
      return { success: false, isDuplicate: true };
    }
    const newQuote: Quote = {
      id: `q_${Date.now()}`,
      ...newQuoteData,
      status: 'Unpublished',
    };
    
    // Update local state & cache
    const updated = [newQuote, ...quotes];
    setQuotesState(updated);
    localStorage.setItem('quotes_repository', JSON.stringify(updated));

    // Persist to backend server
    fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newQuote)
    }).catch(err => console.error("Failed to add quote to backend:", err));

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
