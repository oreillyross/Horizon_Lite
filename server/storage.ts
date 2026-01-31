import { users, type User, type InsertUser } from "@shared/schema";
import { snippets, type Snippet, type InsertSnippet } from "@shared/schema";
import { normalizeTag } from "./utils/tags";
import { db } from "./db";
import { eq } from "drizzle-orm";
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

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  getUserByUsername(username: string): Promise<User | undefined>;

  createUser(user: InsertUser): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
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
  getSnippets(): Promise<Snippet[]>;
  createSnippet(snippet: Snippet): Promise<Snippet>;
  updateSnippet(
    id: string,
    data: Pick<InsertSnippet, "content" | "tags">,
  ): Promise<Snippet>;
  getTags(): Promise<Array<{ tag: string; count: number }>>;
  globalSearch(q: string, limit: number): Promise<GlobalSearchResult[]>;
}

export class SnippetStorage implements ISnippetStorage {
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
      const tagHit = tags.some((t) => (t ?? "").toLowerCase().includes(ql));

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

  async createSnippet(insertSnippet: InsertSnippet): Promise<Snippet> {
    const [snippet] = await db
      .insert(snippets)
      .values(insertSnippet)
      .returning();
    return snippet;
  }
  async getSnippets(): Promise<Snippet[]> {
    return await db.select().from(snippets);
  }

  async getTags(): Promise<
    Array<{ tag: string; slug: string; count: number }>
  > {
    const all = await this.getSnippets();

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
    data: Pick<Snippet, "content" | "tags">,
  ): Promise<Snippet> {
    const [updated] = await db
      .update(snippets)
      .set({
        content: data.content,
        tags: data.tags,
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
