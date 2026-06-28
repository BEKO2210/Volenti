'use client';

import { useState } from 'react';
import { intentInputSchema } from '@/lib/validation/intent';
import { classifyIntentHeuristic } from '@/lib/ai/intent-router';
import type { IntentClassification } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<IntentClassification['type'], string> = {
  text: 'Text',
  image: 'Bild',
  document: 'Dokument',
  unsupported: 'Noch nicht unterstützt',
};

/**
 * The "Ich möchte…" launcher (Yuki · Frontend, Lena · UX).
 *
 * In this P0 foundation the launcher validates the intent and shows the
 * deterministic heuristic classification. The actual text generation flow
 * (Anthropic Sonnet, streaming) is wired in roadmap P0 step 4 — until then the
 * UI is honest about what it does and does NOT fabricate an artifact.
 */
export function IntentLauncher() {
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntentClassification | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);

    const parsed = intentInputSchema.safeParse({ intent: value });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.');
      return;
    }

    setResult(classifyIntentHeuristic(parsed.data.intent));
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label htmlFor="intent" className="text-muted-foreground text-sm font-medium">
          Ich möchte…
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="intent"
            name="intent"
            type="text"
            inputMode="text"
            autoComplete="off"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="… eine freundliche Absage-E-Mail schreiben"
            aria-invalid={error !== null}
            aria-describedby={error ? 'intent-error' : undefined}
            className={cn(
              'bg-background flex-1 rounded-lg border px-4 py-3 text-base outline-none',
              'focus-visible:ring-accent transition focus-visible:ring-2',
              error ? 'border-red-500' : 'border-border',
            )}
          />
          <button
            type="submit"
            className={cn(
              'bg-accent text-accent-foreground rounded-lg px-5 py-3 text-base font-medium',
              'focus-visible:ring-accent transition hover:opacity-90 focus-visible:ring-2',
            )}
          >
            Erkennen
          </button>
        </div>
      </form>

      {error && (
        <p id="intent-error" role="alert" className="mt-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {result && (
        <div className="border-border bg-muted/50 mt-4 rounded-lg border p-4 text-sm">
          <p>
            Erkannter Typ: <span className="font-semibold">{TYPE_LABELS[result.type]}</span>{' '}
            <span className="text-muted-foreground">
              ({Math.round(result.confidence * 100)}% Zuversicht)
            </span>
          </p>
          {result.type === 'unsupported' ? (
            <p className="text-muted-foreground mt-1">
              Diesen Intent kann Volenti (noch) nicht erfüllen. Ehrliche Absage statt halber Lösung.
            </p>
          ) : (
            <p className="text-muted-foreground mt-1">
              Die eigentliche Generierung folgt im nächsten Entwicklungsschritt. Erzeugte Inhalte
              werden stets als KI-generiert gekennzeichnet (EU-AI-Act).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
