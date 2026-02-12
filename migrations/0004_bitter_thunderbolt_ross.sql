CREATE TABLE "analyst_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analyst_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint

-- 1) Expand: add new columns as NULLable first
ALTER TABLE "users" RENAME COLUMN "password" TO "password_hash";
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" text DEFAULT 'analyst' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "analyst_group_id" uuid;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint

-- 2) Backfill: create a default group + populate existing users
INSERT INTO "analyst_groups" ("name")
VALUES ('default')
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint

UPDATE "users"
SET
	"email" = COALESCE("email", CONCAT('legacy+', "id", '@horizon.local')),
	"analyst_group_id" = COALESCE(
		"analyst_group_id",
		(SELECT "id" FROM "analyst_groups" WHERE "name" = 'default' LIMIT 1)
	)
WHERE "email" IS NULL OR "analyst_group_id" IS NULL;
--> statement-breakpoint

-- 3) Contract: enforce constraints now that data exists
ALTER TABLE "users" ALTER COLUMN "email" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "analyst_group_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "users"
	ADD CONSTRAINT "users_analyst_group_id_analyst_groups_id_fk"
	FOREIGN KEY ("analyst_group_id")
	REFERENCES "public"."analyst_groups"("id")
	ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
