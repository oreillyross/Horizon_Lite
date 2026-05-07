import { z } from "zod";

export const createIndicatorInputSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(120, "Name must be 120 characters or fewer"),
  category: z.enum(["infoops", "political", "infra", "diplomatic"], {
    required_error: "Category is required",
  }),
  description: z.string().max(2000, "Description must be 2000 characters or fewer").optional(),
  regionScope: z.string().max(100).optional(),
  strength: z
    .number({ invalid_type_error: "Strength must be a number" })
    .int()
    .min(1, "Minimum strength is 1")
    .max(9, "Maximum strength is 9")
    .default(5),
  timeWeight: z.enum(["day", "week", "month", "year"]).default("week"),
  decayBehaviour: z.enum(["linear", "step", "none"]).default("linear"),
});

export type CreateIndicatorInput = z.infer<typeof createIndicatorInputSchema>;
