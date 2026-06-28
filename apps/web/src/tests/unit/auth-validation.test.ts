import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema, MIN_PASSWORD_LENGTH } from '@/lib/validation/auth';

describe('loginSchema', () => {
  it('accepts a valid email and non-empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@example.com', password: 'x' }).success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false);
  });

  it('rejects an empty password', () => {
    expect(loginSchema.safeParse({ email: 'a@example.com', password: '' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts a valid registration', () => {
    const result = registerSchema.safeParse({
      name: 'Belkis',
      email: 'b@example.com',
      password: 'a'.repeat(MIN_PASSWORD_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it('rejects a too-short password', () => {
    const result = registerSchema.safeParse({
      name: 'Belkis',
      email: 'b@example.com',
      password: 'a'.repeat(MIN_PASSWORD_LENGTH - 1),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a too-short name', () => {
    expect(
      registerSchema.safeParse({ name: 'B', email: 'b@example.com', password: 'a'.repeat(12) })
        .success,
    ).toBe(false);
  });
});
