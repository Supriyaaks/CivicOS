import { z } from 'zod';

export const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID format');

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1, 'Department name is required'),
  code: z.string().min(1, 'Department code is required'),
  staffCount: z.number().int().nonnegative().optional().default(0),
  workload: z.string().optional().default('Medium'),
});

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial();
