// server/seed.ts
import bcrypt from "bcrypt";
import { db } from "./db";
import { users } from "@shared/db"; // adjust path
import { analystGroups } from "@shared/db"; // when created
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

async function seed() {
  console.log("🌱 Seeding database...");

  // 1️⃣ Create default analyst group
  const [defaultGroup] = await db
    .insert(analystGroups)
    .values({
      name: "Default",
    })
    .onConflictDoNothing()
    .returning();

  // If group already exists, fetch it
  const group =
    defaultGroup ??
    (await db.select().from(analystGroups).where(eq(analystGroups.name, "Default")).limit(1))[0];

  // 2️⃣ Create admin user
  const passwordHash = await bcrypt.hash("adminpassword123", SALT_ROUNDS);

  await db
    .insert(users)
    .values({
      email: "admin@horizon.local",
      username: "admin@horizon.local",
      passwordHash,
      role: "admin",
      analystGroupId: group.id,
    })
    .onConflictDoNothing();

  console.log("✅ Seeding complete");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
