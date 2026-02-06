import { users, type UserRow, type InsertUser } from "@shared/db";
import {
  snippets,
  themes,
  type SnippetRow,
  type InsertSnippet,
  type ThemeRow,
  
  recentSourceItems,
  recentSources,
} from "@shared/db";
import {type ThemeListItem} from "@shared"
import { normalizeTag } from "./utils/tags";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

export type GlobalSearchResult = {
  id: string;
  content: string;
  tags: string[];
  createdAt: Date;
  score: number;
  excerpt: string;
};

function makeExcerpt(content: string, q: string, max = 140) {
  const lower = content.toLowerCase();
  const i = lower.indexOf(q.toLowerCase());
  if (i === -1) return content.slice(0, max);
  const start = Math.max(0, i - Math.floor(max / 3));
  const end = Math.min(content.length, start + max);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return `${prefix}${content.slice(start, end)}${suffix}`;
}

export interface IThemeStorage {
  // themes
  getThemes(): Promise<ThemeListItem[]>;
  getThemeById(id: string): Promise<ThemeRow | undefined>;
  createTheme(input: {
    name: string;
    description?: string | null;
  }): Promise<ThemeRow>;
  updateTheme(input: {
    id: string;
    name?: string;
    description?: string | null;
  }): Promise<ThemeRow>;
  deleteTheme(id: string): Promise<boolean>;

  // snippets
  setSnippetTheme(input: {
    snippetId: string;
    themeId: string | null;
  }): Promise<void>;
}

export class ThemeStorage implements IThemeStorage {
  async getThemes(): Promise<ThemeListItem[]> {
    // Left join snippets to compute counts
    const rows = await db
      .select({
        id: themes.id,
        name: themes.name,
        description: themes.description,
        synopsisUpdatedAt: themes.synopsisUpdatedAt,
        synopsisVersion: themes.synopsisVersion,
        snippetCount: sql<number>`count(${snippets.id})`.as("snippet_count"),
      })
      .from(themes)
      .leftJoin(snippets, eq(snippets.themeId, themes.id))
      .groupBy(
        themes.id,
        themes.name,
        themes.description,
        themes.synopsisUpdatedAt,
        themes.synopsisVersion,
      )
      .orderBy(desc(themes.updatedAt), themes.name);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? null,
      synopsisUpdatedAt: r.synopsisUpdatedAt ?? null,
      synopsisVersion: r.synopsisVersion ?? 0,
      snippetCount: Number(r.snippetCount ?? 0),
    }));
  }

  async getThemeById(id: string): Promise<ThemeRow | undefined> {
    const [row] = await db
      .select()
      .from(themes)
      .where(eq(themes.id, id))
      .limit(1);
    return row ? (row as ThemeRow) : undefined;
  }

  async createTheme(input: {
    name: string;
    description?: string | null;
  }): Promise<ThemeRow> {
    const [row] = await db
      .insert(themes)
      .values({
        name: input.name.trim(),
        description: input.description ?? null,
        // synopsis fields default null/0 via schema defaults
      })
      .returning();

    return row as ThemeRow;
  }

  async updateTheme(input: {
    id: string;
    name?: string;
    description?: string | null;
  }): Promise<ThemeRow> {
    const patch: Record<string, any> = {
      updatedAt: new Date(),
    };

    if (typeof input.name === "string") patch.name = input.name.trim();
    if (input.description !== undefined) patch.description = input.description;

    const [row] = await db
      .update(themes)
      .set(patch)
      .where(eq(themes.id, input.id))
      .returning();

    if (!row) throw new Error("Theme not found");
    return row as ThemeRow;
  }

  async deleteTheme(id: string): Promise<boolean> {
    const [row] = await db
      .delete(themes)
      .where(eq(themes.id, id))
      .returning({ id: themes.id });
    return !!row;
  }

  async setSnippetTheme(input: {
    snippetId: string;
    themeId: string | null;
  }): Promise<void> {
    await db
      .update(snippets)
      .set({
        themeId: input.themeId, // null allowed
        // TODO updatedAt: new Date(),  // keep snippet "last updated" accurate if you track it
      })
      .where(eq(snippets.id, input.snippetId));
  }
}

export interface IStorage {
  getUser(id: string): Promise<UserRow | undefined>;
  getUsers(): Promise<UserRow[]>;
  getUserByUsername(username: string): Promise<UserRow | undefined>;

  createUser(user: InsertUser): Promise<UserRow>;
  deleteUser(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<UserRow | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUsers(): Promise<UserRow[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<UserRow | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<UserRow> {
    const hashedPassword = await bcrypt.hash(insertUser.password, SALT_ROUNDS);
    const [user] = await db
      .insert(users)
      .values({ ...insertUser, password: hashedPassword })
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }
}

export interface ISnippetStorage {
  getRecentSourceItems(limit: number): Promise<
    Array<{
      id: string;
      title: string;
      url: string;
      excerpt: string | null;
      publishedAt: Date | null;
      fetchedAt: Date;
      capturedAt: Date | null;
      capturedSnippetId: string | null;

      sourceId: string;
      sourceName: string;
    }>
  >;

  refreshSources(): Promise<{ ok: true; inserted: number }>;

  captureSourceItem(
    id: string,
  ): Promise<{ alreadyCaptured: boolean; snippetId: string | null }>;

  getSnippets(): Promise<SnippetRow[]>;
  getSnippetById(id: string): Promise<SnippetRow | null>;
  createSnippet(snippet: InsertSnippet): Promise<SnippetRow>;
  updateSnippet(
    id: string,
    data: Pick<InsertSnippet, "content" | "tags">,
  ): Promise<SnippetRow>;
  deleteSnippet(id: string): Promise<SnippetRow | undefined>;
  getTags(): Promise<Array<{ tag: string; slug: string; count: number }>>;
  globalSearch(q: string, limit: number): Promise<GlobalSearchResult[]>;
}

export class SnippetStorage implements ISnippetStorage {
  async getRecentSourceItems(limit: number) {
    const rows = await db
      .select({
        id: recentSourceItems.id,
        title: recentSourceItems.title,
        url: recentSourceItems.url,
        excerpt: recentSourceItems.excerpt,
        publishedAt: recentSourceItems.publishedAt,
        fetchedAt: recentSourceItems.fetchedAt,
        capturedAt: recentSourceItems.capturedAt,
        capturedSnippetId: recentSourceItems.capturedSnippetId,

        sourceId: recentSourceItems.sourceId,
        sourceName: recentSources.name,
      })
      .from(recentSourceItems)
      .innerJoin(
        recentSources,
        eq(recentSourceItems.sourceId, recentSources.id),
      )
      .orderBy(desc(recentSourceItems.fetchedAt))
      .limit(limit);

    return rows;
  }

  async refreshSources(): Promise<{ ok: true; inserted: number }> {
    const existing = await db.select().from(recentSources).limit(1);
    let sourceId = existing[0]?.id;

    if (!sourceId) {
      const [created] = await db
        .insert(recentSources)
        .values({
          name: "My dummy source",
          url: "https://dummy.net",
          enabled: true,
        })
        .returning();

      sourceId = created.id;
    }

    const now = new Date();
    const candidates = [
      {
        sourceId,
        title: "Example headline 1",
        url: "https://example.com/article-1",
        publishedAt: now,
        excerpt: "Short preview text for article 1…",
        rawText: null,
      },
      {
        sourceId,
        title: "Example headline 2",
        url: "https://example.com/article-2",
        publishedAt: now,
        excerpt: "Short preview text for article 2…",
        rawText: null,
      },
      {
        sourceId,
        title: "Example headline 3",
        url: "https://example.com/article-3",
        publishedAt: now,
        excerpt: "Short preview text for article 3…",
        rawText: null,
      },
    ] as const;

    let inserted = 0;

    for (const item of candidates) {
      const res = await db
        .insert(recentSourceItems)
        .values(item)
        .onConflictDoNothing({ target: recentSourceItems.url })
        .returning({ id: recentSourceItems.id });

      if (res.length > 0) inserted += 1;
    }

    return { ok: true as const, inserted };
  }

  async captureSourceItem(id: string) {
    const [item] = await db
      .select()
      .from(recentSourceItems)
      .where(eq(recentSourceItems.id, id))
      .limit(1);

    if (!item) throw new Error("Source item not found");
    if (item.capturedAt) {
      return {
        alreadyCaptured: true,
        snippetId: item.capturedSnippetId ?? null,
      };
    }

    // create snippet content (simple + readable)
    const content =
      `# ${item.title}\n\n` +
      `${item.url}\n\n` +
      (item.excerpt ? `${item.excerpt}\n\n` : "") +
      (item.rawText ? `${item.rawText}\n` : "");

    const [snippet] = await db
      .insert(snippets)
      .values({
        content,
        tags: [], // you said auto-tagging later
      })
      .returning();

    await db
      .update(recentSourceItems)
      .set({
        capturedAt: new Date(),
        capturedSnippetId: snippet.id,
      })
      .where(eq(recentSourceItems.id, item.id));

    return { alreadyCaptured: false, snippetId: snippet.id };
  }

  async globalSearch(q: string, limit = 20): Promise<GlobalSearchResult[]> {
    const query = q.trim();
    if (!query) return [];

    const all = await this.getSnippets(); // already exists
    const ql = query.toLowerCase();

    const results: GlobalSearchResult[] = [];

    for (const s of all) {
      const content = s.content ?? "";
      const tags = s.tags ?? [];

      const contentHit = content.toLowerCase().includes(ql);
      const tagHit = tags.some((t: any) => (t ?? "").toLowerCase().includes(ql));

      if (!contentHit && !tagHit) continue;

      // dumb scoring: content beats tag, earlier match beats later, shorter beats longer
      const idx = content.toLowerCase().indexOf(ql);
      const score =
        (contentHit ? 1000 : 0) +
        (tagHit ? 250 : 0) +
        (idx >= 0 ? Math.max(0, 200 - idx) : 0) -
        Math.min(100, Math.floor(content.length / 500));

      results.push({
        id: s.id,
        content,
        tags,
        createdAt: s.createdAt,
        score,
        excerpt: makeExcerpt(content, query),
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  async getSnippetById(id: string) {
    const [row] = await db.select().from(snippets).where(eq(snippets.id, id));
    return row ?? null;
  }

  async createSnippet(insertSnippet: InsertSnippet): Promise<SnippetRow> {
    const [snippet] = await db
      .insert(snippets)
      .values(insertSnippet)
      .returning();
    return snippet;
  }
  async getSnippets(): Promise<SnippetRow[]> {
    return await db.select().from(snippets);
  }

  async getTags(): Promise<
    Array<{ tag: string; slug: string; count: number }>
  > {
    const all = await this.getSnippets();1

    const counts = new Map<string, number>();

    for (const s of all) {
      for (const raw of s.tags ?? []) {
        const tag = raw;
        if (!tag) continue;
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([tag, count]) => ({ tag, slug: normalizeTag(tag), count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  async updateSnippet(
    id: string,
    data: Pick<SnippetRow, "content" | "tags" | "themeId">,
  ): Promise<SnippetRow> {
    const [updated] = await db
      .update(snippets)
      .set({
        content: data.content,
        tags: data.tags,
        themeId: data.themeId ?? null,
      })
      .where(eq(snippets.id, id))
      .returning();

    if (!updated) {
      throw new Error("Snippet not found");
    }

    return updated;
  }

  async deleteSnippet(id: string) {
    const result = await db
      .delete(snippets)
      .where(eq(snippets.id, id))
      .returning();
    return result[0];
  }
}

export const snippetStorage = new SnippetStorage();

export const storage = new DatabaseStorage();

export const themeStorage = new ThemeStorage();
