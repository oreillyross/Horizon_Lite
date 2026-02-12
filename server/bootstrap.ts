import bcrypt from "bcrypt";
import { db } from "./db";
import { analystGroups, users } from "@shared/db";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 12;

async function ensureDefaultGroup() {
  const [inserted] = await db
    .insert(analystGroups)
    .values({ name: "Default" })
    .onConflictDoNothing()
    .returning();

  const group =
    inserted ??
    (await db
      .select()
      .from(analystGroups)
      .where(eq(analystGroups.name, "Default"))
      .limit(1))[0];

  if (!group) throw new Error("Failed to create/find Default analyst group");
  return group;
}

async function maybeEnsureAdmin(defaultGroupId: string) {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  // No env vars => do nothing (safe)
  if (!email || !password) return;

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) return;

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await db.insert(users).values({
    email,
    username: email,
    passwordHash,
    role: "admin",
    analystGroupId: defaultGroupId,
  });

  console.log(`✅ Bootstrapped admin user: ${email}`);
}

async function main() {
  console.log("🚀 Bootstrapping baseline data...");

  const group = await ensureDefaultGroup();
  await maybeEnsureAdmin(group.id);

  console.log("✅ Bootstrap complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
