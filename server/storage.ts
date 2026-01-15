import { users, type User, type InsertUser } from "@shared/schema";
import { snippets, type Snippet, type InsertSnippet } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

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
}

export class SnippetStorage implements ISnippetStorage {
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
}

export const snippetStorage = new SnippetStorage()

export const storage = new DatabaseStorage();
