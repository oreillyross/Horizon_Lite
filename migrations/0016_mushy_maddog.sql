-- Step 1: Drop existing FK constraint that references the column being altered
ALTER TABLE "signal_events" DROP CONSTRAINT IF EXISTS "signal_events_indicator_id_indicators_id_fk";--> statement-breakpoint
-- Step 2: Alter the primary key column (indicators.id) FIRST
ALTER TABLE "indicators"
ALTER COLUMN "id"
SET DATA TYPE uuid USING
  CASE
    WHEN id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN id::uuid
    ELSE gen_random_uuid()
  END;--> statement-breakpoint
ALTER TABLE "indicators" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
-- Step 3: Now alter the referencing columns
ALTER TABLE "signal_events"
ALTER COLUMN "indicator_id"
SET DATA TYPE uuid USING
  CASE
    WHEN indicator_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN indicator_id::uuid
    ELSE gen_random_uuid()
  END;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map"
ALTER COLUMN "scenario_id"
SET DATA TYPE uuid USING
  CASE
    WHEN scenario_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN scenario_id::uuid
    ELSE gen_random_uuid()
  END;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map"
ALTER COLUMN "indicator_id"
SET DATA TYPE uuid USING
  CASE
    WHEN indicator_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN indicator_id::uuid
    ELSE gen_random_uuid()
  END;--> statement-breakpoint
-- Step 4: Add new columns
ALTER TABLE "indicators" ADD COLUMN "strength" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "time_weight" text DEFAULT 'week' NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "decay_behaviour" text DEFAULT 'linear' NOT NULL;--> statement-breakpoint
ALTER TABLE "scenarios" ADD COLUMN "theme_id" uuid;--> statement-breakpoint
-- Step 5: Re-add all FK constraints (including the one dropped in step 1)
ALTER TABLE "signal_events" ADD CONSTRAINT "signal_events_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map" ADD CONSTRAINT "scenario_indicator_map_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map" ADD CONSTRAINT "scenario_indicator_map_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scenarios_theme_id_idx" ON "scenarios" USING btree ("theme_id");
