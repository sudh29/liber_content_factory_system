/**
 * Utility functions for preventing duplicate content.
 */

import { Quote } from '../types';

/**
 * Normalizes a string for deduplication comparison by converting to lowercase
 * and removing all non-alphanumeric characters.
 */
export function normalizeForDedup(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Checks if a proposed quote text already exists in the provided array of quotes.
 */
export function isDuplicateQuote(quotes: Quote[], newText: string): boolean {
  const normalizedNewText = normalizeForDedup(newText);
  return quotes.some(
    (q) => normalizeForDedup(q.text) === normalizedNewText
  );
}
