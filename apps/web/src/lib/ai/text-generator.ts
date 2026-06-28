import Anthropic from '@anthropic-ai/sdk';
import { MODELS, type ModelId } from '@/lib/ai/types';
import { TEXT_SYSTEM_PROMPT, buildTextUserPrompt } from '@/lib/ai/prompts';
import { loadEnv, requireEnv } from '@/lib/validation/env';

export interface TextGenerationResult {
  text: string;
  model: ModelId;
  tokenIn: number;
  tokenOut: number;
}

/**
 * Abstraction over the text-generation backend. The orchestration depends on
 * this interface, not on the SDK directly, so it can be exercised in tests with
 * a fake implementation (no API key, no network).
 */
export interface TextGenerator {
  generate(intent: string): Promise<TextGenerationResult>;
}

/**
 * Real Anthropic-backed generator (Claude Sonnet, streaming under the hood to
 * avoid HTTP timeouts on long outputs). Requires ANTHROPIC_API_KEY — if it is
 * missing, construction fails loudly via requireEnv instead of fabricating a
 * result (CLAUDE.md rule 2).
 */
export function createAnthropicTextGenerator(): TextGenerator {
  const env = loadEnv();
  const apiKey = requireEnv('ANTHROPIC_API_KEY', env);
  const client = new Anthropic({ apiKey });

  return {
    async generate(intent: string): Promise<TextGenerationResult> {
      const stream = client.messages.stream({
        model: MODELS.generator,
        max_tokens: 4096,
        system: TEXT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildTextUserPrompt(intent) }],
      });

      const message = await stream.finalMessage();

      const text = message.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('')
        .trim();

      if (text.length === 0) {
        throw new Error('Die Textgenerierung lieferte ein leeres Ergebnis.');
      }

      return {
        text,
        model: MODELS.generator,
        tokenIn: message.usage.input_tokens,
        tokenOut: message.usage.output_tokens,
      };
    },
  };
}
