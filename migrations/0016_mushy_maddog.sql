ALTER TABLE "signal_events" ALTER COLUMN "indicator_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map" ALTER COLUMN "scenario_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map" ALTER COLUMN "indicator_id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "indicators" ALTER COLUMN "id" SET DATA TYPE uuid;--> statement-breakpoint
ALTER TABLE "indicators" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "strength" integer DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "time_weight" text DEFAULT 'week' NOT NULL;--> statement-breakpoint
ALTER TABLE "indicators" ADD COLUMN "decay_behaviour" text DEFAULT 'linear' NOT NULL;--> statement-breakpoint
ALTER TABLE "scenarios" ADD COLUMN "theme_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map" ADD CONSTRAINT "scenario_indicator_map_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map" ADD CONSTRAINT "scenario_indicator_map_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scenarios_theme_id_idx" ON "scenarios" USING btree ("theme_id");