import { describe, it, expect } from 'vitest';
import { TEXT_SYSTEM_PROMPT, buildTextUserPrompt } from '@/lib/ai/prompts';

describe('TEXT_SYSTEM_PROMPT', () => {
  it('instructs to return only the artifact without meta-preamble', () => {
    expect(TEXT_SYSTEM_PROMPT).toMatch(/ohne Vor- oder Nachrede/);
    expect(TEXT_SYSTEM_PROMPT).toMatch(/Erfinde keine Fakten/);
  });
});

describe('buildTextUserPrompt', () => {
  it('embeds the trimmed intent', () => {
    const prompt = buildTextUserPrompt('  Schreibe eine E-Mail  ');
    expect(prompt).toContain('Schreibe eine E-Mail');
    expect(prompt).not.toMatch(/ {2}Schreibe/);
  });

  it('is deterministic for the same input', () => {
    expect(buildTextUserPrompt('Test')).toBe(buildTextUserPrompt('Test'));
  });
});
