import { ScriptSentence } from '../types';

/**
 * Splits a script into sentence-level units with stable IDs S01, S02, …
 * Handles common screenplay markers like [INTRO], [SCENE 1], etc.
 */
export function parseScriptSentences(script: string): ScriptSentence[] {
  const sentences: ScriptSentence[] = [];
  let index = 0;

  const lines = script.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip pure stage-direction lines: [INTRO], [SCENE 1], etc.
    if (/^\[.*\]$/.test(trimmed)) continue;

    // Remove inline markers at the start of a line (e.g. "[HOOK] The car ...")
    const cleaned = trimmed.replace(/^\[.*?\]\s*/g, '').trim();
    if (!cleaned || cleaned.length < 5) continue;

    // Split on sentence-ending punctuation followed by whitespace
    const parts = cleaned.split(/(?<=[.!?])\s+/);

    for (const part of parts) {
      const text = part.trim();
      if (text.length < 5) continue;

      const id = `S${String(index + 1).padStart(2, '0')}`;
      sentences.push({ id, index, text });
      index++;
    }
  }

  return sentences;
}

/** Normalise a string for comparison: lowercase, strip punctuation, collapse spaces. */
function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/["""''.,!?;:\-–—()\[\]\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Return the IDs of sentences that are covered by a segment's excerpt.
 * Uses word-overlap scoring and falls back to the closest single sentence.
 */
export function mapSentencesToExcerpt(
  excerpt: string,
  sentences: ScriptSentence[]
): string[] {
  if (!sentences.length || !excerpt.trim()) return [];

  const exNorm = normalise(excerpt);
  const matched = new Set<string>();

  for (const sentence of sentences) {
    const sNorm = normalise(sentence.text);

    // Direct substring check
    if (exNorm.includes(sNorm) || sNorm.includes(exNorm)) {
      matched.add(sentence.id);
      continue;
    }

    // Word-overlap heuristic
    const sWords = sNorm.split(' ').filter(w => w.length > 3);
    const exWords = new Set(exNorm.split(' ').filter(w => w.length > 3));
    if (sWords.length > 0) {
      const hits = sWords.filter(w => exWords.has(w)).length;
      if (hits / sWords.length >= 0.4) {
        matched.add(sentence.id);
      }
    }
  }

  // Always return at least 1 sentence (best-fit by word overlap)
  if (matched.size === 0 && sentences.length > 0) {
    let bestId = sentences[0].id;
    let bestScore = 0;
    for (const sentence of sentences) {
      const score = wordOverlap(excerpt, sentence.text);
      if (score > bestScore) { bestScore = score; bestId = sentence.id; }
    }
    matched.add(bestId);
  }

  // Return IDs in their original order
  return sentences.filter(s => matched.has(s.id)).map(s => s.id);
}

function wordOverlap(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\W+/).filter(w => w.length > 3));
  const wb = b.toLowerCase().split(/\W+/).filter(w => w.length > 3);
  if (!wa.size || !wb.length) return 0;
  return wb.filter(w => wa.has(w)).length / Math.max(wa.size, wb.length);
}

/**
 * Format a list of sentence IDs for display.
 * ["S01","S02","S03"] → "S01–S03"
 * ["S02"] → "S02"
 * ["S01","S04"] → "S01, S04"
 */
export function formatSentenceRange(ids: string[]): string {
  if (!ids || ids.length === 0) return '';
  if (ids.length === 1) return ids[0];

  const nums = ids.map(id => parseInt(id.replace('S', ''), 10));
  const isContiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);

  return isContiguous
    ? `${ids[0]}–${ids[ids.length - 1]}`
    : ids.join(', ');
}
