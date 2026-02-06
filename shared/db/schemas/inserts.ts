import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { recentSources, recentSourceItems, users, snippets, themes } from "../tables";

export const insertRecentSourceSchema = createInsertSchema(recentSources).pick({
  name: true,
  url: true,
  enabled: true,
});
export type InsertRecentSource = z.infer<typeof insertRecentSourceSchema>;

// recentSourceItems insert
export const insertRecentSourceItemSchema = createInsertSchema(recentSourceItems).pick({
  sourceId: true,
  title: true,
  url: true,
  publishedAt: true,
  excerpt: true,
  rawText: true,
});
export type InsertRecentSourceItem = z.infer<typeof insertRecentSourceItemSchema>;

// users insert
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;

// snippets insert
export const insertSnippetSchema = createInsertSchema(snippets).pick({
  content: true,
  tags: true,
  sourceUrl: true,
  sourceHost: true,
  sourceTitle: true,
  themeId: true,
});
export type InsertSnippet = z.infer<typeof insertSnippetSchema>;


export const insertThemeSchema = createInsertSchema(themes).pick({
  name: true,
  description: true,
  synopsis: true,
});

export type InsertTheme = z.infer<typeof insertThemeSchema>;
