ALTER TABLE "snippets" ADD COLUMN "quote" text;--> statement-breakpoint
ALTER TABLE "snippets" ADD COLUMN "pub_date" timestamp;--> statement-breakpoint
ALTER TABLE "snippets" ADD COLUMN "indicator_id" uuid;--> statement-breakpoint
ALTER TABLE "snippets" ADD COLUMN "analyst_notes" text;--> statement-breakpoint
ALTER TABLE "snippets" ADD CONSTRAINT "snippets_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE set null ON UPDATE no action;