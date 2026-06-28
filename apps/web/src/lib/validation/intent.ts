import { z } from 'zod';

/**
 * Validation for a user intent submitted at the "Ich möchte…" launcher.
 * Applied at the request boundary (Zod, CLAUDE.md rule 6) before any AI call.
 */
export const intentInputSchema = z.object({
  intent: z
    .string()
    .trim()
    .min(3, 'Bitte beschreibe etwas genauer, was du möchtest.')
    .max(2000, 'Die Eingabe ist zu lang (max. 2000 Zeichen).'),
});

export type IntentInput = z.infer<typeof intentInputSchema>;
