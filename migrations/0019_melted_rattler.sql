ALTER TABLE "scenarios" DROP CONSTRAINT "scenarios_theme_id_themes_id_fk";
--> statement-breakpoint
ALTER TABLE "scenarios" ALTER COLUMN "theme_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "signal_events" ADD COLUMN "status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;