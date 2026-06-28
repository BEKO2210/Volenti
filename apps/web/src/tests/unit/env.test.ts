import { describe, it, expect } from 'vitest';
import { parseEnv, requireEnv, type ServerEnv } from '@/lib/validation/env';

const VALID_DB = 'postgres://volenti:pw@localhost:5432/volenti';

describe('parseEnv', () => {
  it('parses a minimal valid environment with defaults applied', () => {
    const env = parseEnv({ DATABASE_URL: VALID_DB });
    expect(env.NODE_ENV).toBe('development');
    expect(env.DATABASE_URL).toBe(VALID_DB);
    expect(env.BETTER_AUTH_URL).toBe('http://localhost:3000');
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });

  it('throws a readable error when DATABASE_URL is missing', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('throws when DATABASE_URL is not a valid URL', () => {
    expect(() => parseEnv({ DATABASE_URL: 'not-a-url' })).toThrow(/valid postgres connection URL/);
  });

  it('rejects an unknown NODE_ENV value', () => {
    expect(() => parseEnv({ DATABASE_URL: VALID_DB, NODE_ENV: 'staging' })).toThrow();
  });

  it('keeps optional provider keys undefined when absent', () => {
    const env = parseEnv({ DATABASE_URL: VALID_DB });
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
  });
});

describe('requireEnv', () => {
  const baseEnv: ServerEnv = parseEnv({ DATABASE_URL: VALID_DB });

  it('returns the value when the credential is present', () => {
    const env: ServerEnv = { ...baseEnv, ANTHROPIC_API_KEY: 'sk-test-123' };
    expect(requireEnv('ANTHROPIC_API_KEY', env)).toBe('sk-test-123');
  });

  it('throws an actionable error (no faking) when the credential is missing', () => {
    expect(() => requireEnv('ANTHROPIC_API_KEY', baseEnv)).toThrow(
      /Missing required environment variable "ANTHROPIC_API_KEY"/,
    );
    expect(() => requireEnv('ANTHROPIC_API_KEY', baseEnv)).toThrow(/never\s+fabricates/);
  });
});
