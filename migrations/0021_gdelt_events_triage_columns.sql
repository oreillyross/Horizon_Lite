ALTER TABLE "gdelt_events" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "gdelt_events" ADD COLUMN "source_name" text;--> statement-breakpoint
ALTER TABLE "gdelt_events" ADD COLUMN "status" text NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "gdelt_events" ADD COLUMN "ingested_at" timestamp with time zone DEFAULT now() NOT NULL;
