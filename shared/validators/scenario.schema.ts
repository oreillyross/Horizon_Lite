import { z } from "zod";

export const createScenarioInputSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  description: z
    .string()
    .min(1, "Description is required")
    .max(2000, "Description must be 2000 characters or fewer"),
});

export type CreateScenarioInput = z.infer<typeof createScenarioInputSchema>;

export const updateScenarioInputSchema = z.object({
  id: z.string().uuid(),
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
  description: z
    .string()
    .min(1, "Description cannot be empty")
    .max(2000, "Description must be 2000 characters or fewer")
    .optional(),
});

export type UpdateScenarioInput = z.infer<typeof updateScenarioInputSchema>;

export const scenarioIdSchema = z.object({
  id: z.string().uuid(),
});
