'use client';

import { useState, useTransition } from 'react';
import { generateTextAction, type GenerateActionResult } from '@/app/app/actions';
import { intentInputSchema } from '@/lib/validation/intent';
import { cn } from '@/lib/utils';

/**
 * The workspace generation panel (Yuki · Frontend, Lena · UX). Submits an intent
 * to the server action and renders the real text artifact with an AI label
 * (Frederike · EU AI Act). It never fabricates output: if the backend is not
 * configured, it shows that honestly.
 */
export function TextGenerationPanel() {
  const [intent, setIntent] = useState('');
  const [clientError, setClientError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateActionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClientError(null);
    setResult(null);
    setCopied(false);

    const validated = intentInputSchema.safeParse({ intent });
    if (!validated.success) {
      setClientError(validated.error.issues[0]?.message ?? 'Ungültige Eingabe.');
      return;
    }

    const formData = new FormData();
    formData.set('intent', validated.data.intent);
    startTransition(async () => {
      setResult(await generateTextAction(formData));
    });
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <label htmlFor="intent" className="text-muted-foreground text-sm font-medium">
          Ich möchte…
        </label>
        <textarea
          id="intent"
          name="intent"
          rows={3}
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          placeholder="… eine freundliche Absage-E-Mail an einen Bewerber schreiben"
          aria-invalid={clientError !== null}
          className={cn(
            'bg-background w-full resize-y rounded-lg border px-4 py-3 text-base outline-none',
            'focus-visible:ring-accent transition focus-visible:ring-2',
            clientError ? 'border-red-500' : 'border-border',
          )}
        />
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'bg-accent text-accent-foreground self-start rounded-lg px-5 py-3 text-base font-medium',
            'focus-visible:ring-accent transition hover:opacity-90 focus-visible:ring-2 disabled:opacity-60',
          )}
        >
          {pending ? 'Wird generiert…' : 'Generieren'}
        </button>
      </form>

      {clientError && (
        <p role="alert" className="mt-2 text-sm text-red-500">
          {clientError}
        </p>
      )}

      {result && !result.ok && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm"
        >
          {result.message}
        </div>
      )}

      {result && result.ok && (
        <article className="border-border bg-muted/40 mt-4 rounded-lg border p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="bg-accent/15 text-accent-foreground/90 rounded-full px-2.5 py-1 text-xs font-medium">
              KI-generiert
            </span>
            <button
              type="button"
              onClick={() => handleCopy(result.text)}
              className="border-border hover:bg-muted rounded-md border px-2.5 py-1 text-xs font-medium transition"
            >
              {copied ? 'Kopiert' : 'Kopieren'}
            </button>
          </div>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.text}</p>
          <p className="text-muted-foreground mt-3 text-xs">
            Dieses Ergebnis wurde von KI erzeugt ({result.model}) und ist als solches gekennzeichnet
            (EU-AI-Act).
          </p>
        </article>
      )}
    </div>
  );
}
