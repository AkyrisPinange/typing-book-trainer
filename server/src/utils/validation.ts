import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const progressSchema = z.object({
  title: z.string().min(1),
  totalChars: z.number().int().positive(),
  positionIndex: z.number().int().min(0),
  stats: z.object({
    totalTyped: z.number().int().min(0),
    totalErrors: z.number().int().min(0),
    accuracy: z.number().min(0).max(100),
    wpm: z.number().min(0),
    lastSessionAt: z.string().datetime(),
  }),
  updatedAt: z.string().datetime(),
}).refine((data) => data.positionIndex <= data.totalChars, {
  message: 'positionIndex must not exceed totalChars',
  path: ['positionIndex'],
});

