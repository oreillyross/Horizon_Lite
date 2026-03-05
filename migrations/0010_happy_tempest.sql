CREATE TABLE "indicators" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"region_scope" text DEFAULT 'EU-wide',
	"description" text,
	"current_value" double precision DEFAULT 0,
	"baseline_value" double precision DEFAULT 0,
	"acceleration_score" double precision DEFAULT 0,
	"threshold_watch" double precision DEFAULT 1.5,
	"threshold_trigger" double precision DEFAULT 2.5,
	"status" text DEFAULT 'normal',
	"last_triggered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "signal_events"
ADD CONSTRAINT "signal_events_indicator_id_indicators_id_fk"
FOREIGN KEY ("indicator_id")
REFERENCES "public"."indicators"("id")
ON DELETE CASCADE;
