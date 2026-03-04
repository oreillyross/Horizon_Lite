import { z } from "zod";

export const SourceCreateInput = z.object({
  url: z.string().url(),
  title: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional(),
});

export const SourceUpdateInput = z.object({
  id: z.string().min(1),
  url: z.string().url().optional(),
  title: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().nullable().optional(),
});

export const SourceListInput = z.object({
  q: z.string().trim().optional(), // search by url/title
  limit: z.number().int().min(1).max(200).optional(),
});