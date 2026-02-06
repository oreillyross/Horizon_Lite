import type { ThemeRow } from "@shared/db";

export type Theme = ThemeRow;

export type ThemeListItem = {
  id: string;
  name: string;
  description: string | null;
  synopsisUpdatedAt: Date | null;
  synopsisVersion: number;
  snippetCount: number;
};
