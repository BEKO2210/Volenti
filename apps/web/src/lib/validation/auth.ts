import { z } from 'zod';

/** Minimum password length — must match better-auth's server config. */
export const MIN_PASSWORD_LENGTH = 10;

export const loginSchema = z.object({
  email: z.string().trim().email('Bitte eine gültige E-Mail-Adresse angeben.'),
  password: z.string().min(1, 'Bitte das Passwort eingeben.'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Bitte einen Namen mit mind. 2 Zeichen angeben.'),
  email: z.string().trim().email('Bitte eine gültige E-Mail-Adresse angeben.'),
  password: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`,
    ),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
