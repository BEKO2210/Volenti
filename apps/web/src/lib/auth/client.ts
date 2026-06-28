'use client';

import { createAuthClient } from 'better-auth/react';

/**
 * Browser-side better-auth client. Talks to the same-origin /api/auth handler;
 * an explicit baseURL keeps it correct behind the configured public app URL.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

export const { signIn, signUp, signOut, useSession } = authClient;
