import { z } from 'zod';

export const uuidSchema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Invalid UUID format');

export const CreateIncidentSchema = z.object({
  incidentCode: z.string().optional(),
  citizenId: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  location: z.string().min(1, 'Location is required'),
  ward: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).optional().nullable(),
  longitude: z.union([z.number(), z.string()]).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  status: z.string().optional(),
  currentStage: z.number().optional(),
  severity: z.string().optional().default('Medium'),
  priority: z.string().optional().default('Medium'),
  evidenceUrl: z.string().optional().nullable(),
  aiConfidence: z.string().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  impactScore: z.number().optional().nullable(),
});

export const UpdateIncidentSchema = z.object({
  category: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  ward: z.string().optional(),
  latitude: z.union([z.number(), z.string()]).optional().nullable(),
  longitude: z.union([z.number(), z.string()]).optional().nullable(),
  departmentId: z.string().optional().nullable(),
  status: z.string().optional(),
  currentStage: z.number().optional(),
  severity: z.string().optional(),
  priority: z.string().optional(),
  resolutionDate: z.date().optional().nullable(),
  resolutionDescription: z.string().optional().nullable(),
  aiConfidence: z.string().optional().nullable(),
  rootCause: z.string().optional().nullable(),
  impactScore: z.number().optional().nullable(),
  citizenConfirmed: z.boolean().optional(),
});

export const IncidentFilterSchema = z.object({
  departmentId: z.string().optional(),
  status: z.string().optional(),
  category: z.string().optional(),
  ward: z.string().optional(),
  severity: z.string().optional(),
});
