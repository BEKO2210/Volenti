import type { IntentClassification, IntentType } from '@/lib/ai/types';

/**
 * Deterministic heuristic intent pre-classifier.
 *
 * This is a REAL, fully tested classifier — not a placeholder. It performs a
 * fast, zero-cost first pass over the user's wording. In P1 (roadmap step 7)
 * the Claude Haiku router (Amir · AI) wraps this: the heuristic short-circuits
 * obvious cases and seeds the LLM prompt for ambiguous ones. It never fakes an
 * AI result — when it is unsure it returns low confidence so the caller can
 * escalate to the model.
 */

interface Rule {
  type: Exclude<IntentType, 'unsupported'>;
  keywords: readonly string[];
}

// German + English cue words for each artifact type. Ordered by specificity:
// document cues are checked before image/text because "PDF einer Rechnung" is
// a document even though it contains generic words.
const RULES: readonly Rule[] = [
  {
    type: 'document',
    keywords: [
      'pdf',
      'docx',
      'word-dokument',
      'word document',
      'dokument',
      'document',
      'rechnung',
      'invoice',
      'vertrag',
      'contract',
      'lebenslauf',
      'resume',
      'cv',
      'angebot',
      'report',
      'bericht',
    ],
  },
  {
    type: 'image',
    keywords: [
      'bild',
      'image',
      'foto',
      'photo',
      'logo',
      'grafik',
      'graphic',
      'illustration',
      'zeichne',
      'draw',
      'male',
      'render',
      'poster',
      'icon',
      'wallpaper',
    ],
  },
  {
    type: 'text',
    keywords: [
      'text',
      'e-mail',
      'email',
      'mail',
      'blog',
      'blogpost',
      'post',
      'artikel',
      'article',
      'zusammenfassung',
      'summary',
      'summarize',
      'fasse zusammen',
      'übersetze',
      'translate',
      'translation',
      'umschreibe',
      'rewrite',
      'schreibe',
      'write',
      'tweet',
      'caption',
    ],
  },
];

// Intents we deliberately refuse in v1 (CLAUDE.md §1.3): no runtime code/app
// generation, no money movement, no navigation. Honest refusal beats a fake.
const UNSUPPORTED_KEYWORDS: readonly string[] = [
  'app',
  'application',
  'website',
  'webseite',
  'programm',
  'program',
  'code',
  'überweise',
  'überweisung',
  'transfer money',
  'bezahle',
  'pay ',
  'navigiere',
  'navigate',
  'route to',
  'buche',
  'book a flight',
];

function countMatches(haystack: string, keywords: readonly string[]): number {
  return keywords.reduce((count, kw) => (haystack.includes(kw) ? count + 1 : count), 0);
}

/**
 * Classify a raw intent string into an {@link IntentClassification}.
 * Pure and deterministic — the same input always yields the same output.
 */
export function classifyIntentHeuristic(rawIntent: string): IntentClassification {
  const text = rawIntent.toLowerCase().trim();

  if (text.length === 0) {
    return { type: 'unsupported', confidence: 1, reason: 'empty_input' };
  }

  if (countMatches(text, UNSUPPORTED_KEYWORDS) > 0) {
    return {
      type: 'unsupported',
      confidence: 0.85,
      reason: 'matched_unsupported_scope',
    };
  }

  let best: { type: IntentType; score: number } = { type: 'unsupported', score: 0 };
  for (const rule of RULES) {
    const score = countMatches(text, rule.keywords);
    if (score > best.score) {
      best = { type: rule.type, score };
    }
  }

  if (best.score === 0) {
    // No cue matched: defer to the LLM router rather than guessing.
    return { type: 'unsupported', confidence: 0.2, reason: 'no_heuristic_match' };
  }

  // Confidence grows with the number of matching cues, capped below 1 so the
  // LLM router can still override the heuristic.
  const confidence = Math.min(0.5 + best.score * 0.15, 0.9);
  return { type: best.type, confidence, reason: `matched_${best.type}_keywords` };
}
