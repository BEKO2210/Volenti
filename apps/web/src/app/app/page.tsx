import { requireTenant } from '@/lib/auth/guard';
import { TextGenerationPanel } from '@/components/text-generation-panel';
import { LogoutButton } from '@/components/logout-button';

// Protected workspace. requireTenant() redirects unauthenticated visitors to
// /login and yields the tenant context all data access is scoped to.
export const dynamic = 'force-dynamic';

export default async function AppPage() {
  const { email } = await requireTenant();

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-8">
      <header className="border-border flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-muted-foreground text-sm">Angemeldet als</p>
          <p className="font-medium">{email}</p>
        </div>
        <LogoutButton />
      </header>

      <section className="flex flex-1 flex-col items-center justify-center gap-8 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Was möchtest du erstellen?</h1>
          <p className="text-muted-foreground mt-2">Beschreibe dein Ziel in einem Satz.</p>
        </div>
        <TextGenerationPanel />
      </section>

      <footer className="border-border text-muted-foreground border-t pt-4 text-center text-xs">
        KI-generierte Inhalte werden als solche gekennzeichnet · EU-Hosting · DSGVO by design
      </footer>
    </main>
  );
}
