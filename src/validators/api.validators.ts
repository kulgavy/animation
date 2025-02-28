import { z } from 'zod';

export const loginValidator = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(2, 'Password must be at least 2 characters'),
});

export const characterQueryValidator = z.object({
  userId: z.string().uuid('Invalid UUID format'),
  isActive: z.string().regex(/^(true|false)$/, 'isActive must be "true" or "false"'),
});

export const sessionQueryValidator = z.object({
  userId: z.string().uuid('Invalid UUID format'),
});

export const historyQueryValidator = z.object({
  characterId: z.string(),
});

export const logQueryValidator = z.object({
  className: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
});
