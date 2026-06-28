import { describe, it, expect } from 'vitest';
import { defaultTenantName, resolveTenantContext } from '@/lib/auth/tenant';

describe('defaultTenantName', () => {
  it('uses the trimmed name when present', () => {
    expect(defaultTenantName({ name: '  Belkis ', email: 'b@example.com' })).toBe(
      'Belkiss Arbeitsbereich',
    );
  });

  it('falls back to the email local part when name is empty', () => {
    expect(defaultTenantName({ name: '  ', email: 'belkis@example.com' })).toBe(
      'belkiss Arbeitsbereich',
    );
  });

  it('falls back to the email local part when name is null', () => {
    expect(defaultTenantName({ name: null, email: 'team@volenti.app' })).toBe(
      'teams Arbeitsbereich',
    );
  });
});

describe('resolveTenantContext', () => {
  it('returns a full context for a tenant-bound user', () => {
    const ctx = resolveTenantContext({
      id: 'user_1',
      email: 'a@example.com',
      tenantId: '11111111-1111-1111-1111-111111111111',
      role: 'owner',
    });
    expect(ctx).toEqual({
      userId: 'user_1',
      tenantId: '11111111-1111-1111-1111-111111111111',
      role: 'owner',
      email: 'a@example.com',
    });
  });

  it('defaults the role to owner when missing', () => {
    const ctx = resolveTenantContext({
      id: 'user_2',
      email: 'b@example.com',
      tenantId: '22222222-2222-2222-2222-222222222222',
    });
    expect(ctx?.role).toBe('owner');
  });

  it('returns null when there is no tenant binding', () => {
    expect(resolveTenantContext({ id: 'user_3', email: 'c@example.com' })).toBeNull();
  });

  it('returns null for a missing/empty session user', () => {
    expect(resolveTenantContext(null)).toBeNull();
    expect(resolveTenantContext(undefined)).toBeNull();
  });
});
