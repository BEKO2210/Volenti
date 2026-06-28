/**
 * Shared types for the Intent → Router → Generator pipeline (CLAUDE.md §6.1).
 */

/** The artifact categories Volenti v1 can produce, plus an honest "unsupported". */
export type IntentType = 'text' | 'image' | 'document' | 'unsupported';

export interface IntentClassification {
  type: IntentType;
  /** Heuristic confidence in [0, 1]. The LLM router (P1) refines this. */
  confidence: number;
  /** Short machine-readable reason, useful for logging and debugging. */
  reason: string;
}

/** Anthropic model selection per task (Amir · AI). */
export const MODELS = {
  /** Cheap/fast — intent routing. */
  router: 'claude-haiku-4-5-20251001',
  /** High quality — text & document generation. */
  generator: 'claude-sonnet-4-6',
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
