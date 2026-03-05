CREATE TABLE "signal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" text NOT NULL,
	"source_url" text,
	"source_host" text,
	"title" text,
	"score" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenario_indicator_map" (
	"scenario_id" text NOT NULL,
	"indicator_id" text NOT NULL,
	"weight" double precision NOT NULL
);
--> statement-breakpoint
-- ALTER TABLE "signal_events" ADD CONSTRAINT "signal_events_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;