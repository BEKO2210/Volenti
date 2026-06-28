'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/client';
import { cn } from '@/lib/utils';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await signOut();
    setPending(false);
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className={cn(
        'border-border rounded-lg border px-3 py-1.5 text-sm font-medium transition',
        'hover:bg-muted focus-visible:ring-accent focus-visible:ring-2 disabled:opacity-60',
      )}
    >
      {pending ? 'Abmelden…' : 'Abmelden'}
    </button>
  );
}
