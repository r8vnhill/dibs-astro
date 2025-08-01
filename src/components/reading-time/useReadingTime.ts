/**
 * useReadingTime.ts
 * -----------------
 * Preact hook + helpers to compute an estimated reading time for a container.
 */

import { useCallback, useEffect, useState } from 'preact/hooks';

export interface ReadingTimeOptions {
  /** Average words per minute. Default: 250. */
  wordsPerMinute?: number;
}

/** Count minutes from raw text. Minimum 1 minute. */
export function calculateReadingTime(
  text: string,
  { wordsPerMinute = 250 }: ReadingTimeOptions = {}
): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const minutes = Math.ceil(words.length / wordsPerMinute);
  return Math.max(1, minutes);
}

/** Safer query that returns an HTMLElement or null. */
export function getContainer(selector = 'main'): HTMLElement | null {
  const el = document.querySelector(selector);
  return el instanceof HTMLElement ? el : null;
}

/**
 * Extract visible, relevant text from a container.
 * - Removes collapsed <details>
 * - Removes nodes matching `.exclude-from-reading-time`
 */
export function extractRelevantText(
  container: HTMLElement,
  excludeSelector = 'details:not([open]), .exclude-from-reading-time'
): string {
  const clone = container.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(excludeSelector).forEach((el) => el.remove());
  return clone.textContent?.trim() ?? '';
}

/** Compute minutes from text with an optional multiplier/speed override. */
export function computeReadingTimeFromText(
  text: string,
  multiplier = 1,
  wordsPerMinute: number = 250
): number {
  const raw = calculateReadingTime(text, { wordsPerMinute });
  return Math.ceil(raw * multiplier);
}

/**
 * Preact hook that:
 * - grabs a container,
 * - extracts relevant text,
 * - computes minutes with a multiplier,
 * - returns the number or null if not ready.
 */
export function useReadingTime(
  multiplier = 1,
  containerSelector = 'main',
  excludeSelector = 'details:not([open]), .exclude-from-reading-time',
  wordsPerMinute?: number
): number | null {
  const [minutes, setMinutes] = useState<number | null>(null);

  const compute = useCallback(() => {
    const container = getContainer(containerSelector);
    if (!container) return;
    const text = extractRelevantText(container, excludeSelector);
    setMinutes(computeReadingTimeFromText(text, multiplier, wordsPerMinute));
  }, [multiplier, containerSelector, excludeSelector, wordsPerMinute]);

  useEffect(() => {
    compute();
  }, [compute]);

  return minutes;
}
