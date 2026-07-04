import { useState, useEffect } from 'react';
import { Quote } from '../../shared/types';
import { DEFAULT_QUOTES } from '../../shared/data/defaultQuotes';
import { isDuplicateQuote } from '../../shared/utils/dedup';

export function useQuotes() {
  const [quotes, setQuotesState] = useState<Quote[]>([]);

  useEffect(() => {
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
  }, []);

  const setQuotes = (updatedQuotes: Quote[]) => {
    setQuotesState(updatedQuotes);
    localStorage.setItem('quotes_repository', JSON.stringify(updatedQuotes));
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
    setQuotes([newQuote, ...quotes]);
    return { success: true, isDuplicate: false, quote: newQuote };
  };

  const deleteQuote = (id: string): Quote | undefined => {
    const q = quotes.find((x) => x.id === id);
    const updated = quotes.filter((x) => x.id !== id);
    setQuotes(updated);
    return q;
  };

  const scheduleQuote = (id: string, timeStr: string) => {
    const updated = quotes.map((q) => {
      if (q.id === id) {
        return {
          ...q,
          status: 'Scheduled' as const,
          scheduledTime: timeStr,
        };
      }
      return q;
    });
    setQuotes(updated);
  };

  const updateQuoteText = (id: string, text: string) => {
    const updated = quotes.map((q) => (q.id === id ? { ...q, text } : q));
    setQuotes(updated);
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
