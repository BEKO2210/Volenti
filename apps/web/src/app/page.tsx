import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex max-w-xl flex-col items-center gap-4 text-center">
        <span className="border-border text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium">
          Volenti · generativer Produktivitäts-Launcher
        </span>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Sag, was du möchtest.
        </h1>
        <p className="text-muted-foreground text-balance text-lg">
          Ein Satz genügt. Volenti liefert ein echtes, fertiges Artefakt — Text, Dokument oder Bild.
          Keine Platzhalter, keine Fakes.
        </p>
      </header>

      <div className="flex w-full max-w-xs flex-col gap-3 sm:max-w-sm sm:flex-row">
        <Link
          href="/register"
          className="bg-accent text-accent-foreground focus-visible:ring-accent flex-1 rounded-lg px-5 py-3 text-center font-medium transition hover:opacity-90 focus-visible:ring-2"
        >
          Kostenlos starten
        </Link>
        <Link
          href="/login"
          className="border-border hover:bg-muted focus-visible:ring-accent flex-1 rounded-lg border px-5 py-3 text-center font-medium transition focus-visible:ring-2"
        >
          Anmelden
        </Link>
      </div>

      <footer className="text-muted-foreground text-center text-xs">
        KI-generierte Inhalte werden als solche gekennzeichnet · EU-Hosting · DSGVO by design
      </footer>
    </main>
  );
}
