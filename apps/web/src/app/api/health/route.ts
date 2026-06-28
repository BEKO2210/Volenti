import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Liveness probe for Coolify/Docker health checks (Carlos · DevOps). */
export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'volenti-web',
    time: new Date().toISOString(),
  });
}
