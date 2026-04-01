-- Up
CREATE TABLE "scenarios" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "analyst_group_id" uuid NOT NULL REFERENCES "analyst_groups"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "scenarios_group_id_idx" ON "scenarios"("analyst_group_id");
