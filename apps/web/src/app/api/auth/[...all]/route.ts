import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth/auth';

// All better-auth endpoints (sign-up, sign-in, sign-out, session, …) are served
// under /api/auth/* by this catch-all handler.
export const { GET, POST } = toNextJsHandler(auth);
