'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, signUp } from '@/lib/auth/client';
import { loginSchema, registerSchema } from '@/lib/validation/auth';
import { cn } from '@/lib/utils';

type Mode = 'login' | 'register';

const COPY: Record<
  Mode,
  { title: string; cta: string; altText: string; altHref: string; altLabel: string }
> = {
  login: {
    title: 'Anmelden',
    cta: 'Anmelden',
    altText: 'Noch kein Konto?',
    altHref: '/register',
    altLabel: 'Registrieren',
  },
  register: {
    title: 'Konto erstellen',
    cta: 'Registrieren',
    altText: 'Bereits ein Konto?',
    altHref: '/login',
    altLabel: 'Anmelden',
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const copy = COPY[mode];

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (mode === 'register') {
      const parsed = registerSchema.safeParse({ name, email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.');
        return;
      }
      setPending(true);
      const { error: signUpError } = await signUp.email({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      });
      setPending(false);
      if (signUpError) {
        setError(signUpError.message ?? 'Registrierung fehlgeschlagen.');
        return;
      }
    } else {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? 'Ungültige Eingabe.');
        return;
      }
      setPending(true);
      const { error: signInError } = await signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      setPending(false);
      if (signInError) {
        setError(signInError.message ?? 'Anmeldung fehlgeschlagen.');
        return;
      }
    }

    router.push('/app');
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{copy.title}</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {mode === 'register' && (
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Name</span>
            <input
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="border-border bg-background focus-visible:ring-accent rounded-lg border px-3 py-2.5 outline-none focus-visible:ring-2"
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">E-Mail</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="border-border bg-background focus-visible:ring-accent rounded-lg border px-3 py-2.5 outline-none focus-visible:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Passwort</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="border-border bg-background focus-visible:ring-accent rounded-lg border px-3 py-2.5 outline-none focus-visible:ring-2"
          />
        </label>

        {error && (
          <p id="auth-error" role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            'bg-accent text-accent-foreground rounded-lg px-4 py-2.5 font-medium transition',
            'focus-visible:ring-accent hover:opacity-90 focus-visible:ring-2 disabled:opacity-60',
          )}
        >
          {pending ? 'Bitte warten…' : copy.cta}
        </button>
      </form>

      <p className="text-muted-foreground mt-6 text-center text-sm">
        {copy.altText}{' '}
        <Link href={copy.altHref} className="text-foreground font-medium underline">
          {copy.altLabel}
        </Link>
      </p>
    </div>
  );
}
