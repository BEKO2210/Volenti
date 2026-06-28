import { describe, it, expect } from 'vitest';
import { classifyIntentHeuristic } from '@/lib/ai/intent-router';
import { intentInputSchema } from '@/lib/validation/intent';

describe('classifyIntentHeuristic', () => {
  it('classifies an email request as text', () => {
    const r = classifyIntentHeuristic('Schreibe eine freundliche E-Mail an mein Team');
    expect(r.type).toBe('text');
    expect(r.confidence).toBeGreaterThan(0.5);
  });

  it('classifies a PDF/invoice request as document', () => {
    const r = classifyIntentHeuristic('Erstelle eine Rechnung als PDF');
    expect(r.type).toBe('document');
  });

  it('classifies a logo request as image', () => {
    const r = classifyIntentHeuristic('Zeichne ein minimalistisches Logo');
    expect(r.type).toBe('image');
  });

  it('honestly marks out-of-scope app generation as unsupported', () => {
    const r = classifyIntentHeuristic('Baue mir eine komplette App mit Bezahlfunktion');
    expect(r.type).toBe('unsupported');
    expect(r.reason).toBe('matched_unsupported_scope');
  });

  it('returns low-confidence unsupported when no cue matches (defer to LLM)', () => {
    const r = classifyIntentHeuristic('xyzzy plover');
    expect(r.type).toBe('unsupported');
    expect(r.reason).toBe('no_heuristic_match');
    expect(r.confidence).toBeLessThan(0.5);
  });

  it('handles empty input deterministically', () => {
    const r = classifyIntentHeuristic('   ');
    expect(r.type).toBe('unsupported');
    expect(r.reason).toBe('empty_input');
  });

  it('is deterministic: same input → same output', () => {
    const input = 'Fasse diesen Artikel zusammen';
    expect(classifyIntentHeuristic(input)).toEqual(classifyIntentHeuristic(input));
  });
});

describe('intentInputSchema', () => {
  it('accepts a reasonable intent', () => {
    const parsed = intentInputSchema.safeParse({ intent: 'Schreibe einen Blogpost' });
    expect(parsed.success).toBe(true);
  });

  it('trims and rejects too-short input', () => {
    const parsed = intentInputSchema.safeParse({ intent: '  a ' });
    expect(parsed.success).toBe(false);
  });

  it('rejects input over the length limit', () => {
    const parsed = intentInputSchema.safeParse({ intent: 'x'.repeat(2001) });
    expect(parsed.success).toBe(false);
  });
});
