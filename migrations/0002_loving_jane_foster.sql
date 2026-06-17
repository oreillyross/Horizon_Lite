CREATE TABLE IF NOT EXISTS "acled_events" (
	"id" text PRIMARY KEY NOT NULL,
	"event_date" timestamp,
	"year" integer,
	"event_type" text,
	"sub_event_type" text,
	"actor1" text,
	"actor2" text,
	"country" text,
	"iso_code" integer,
	"region" text,
	"admin1" text,
	"location" text,
	"latitude" double precision,
	"longitude" double precision,
	"fatalities" integer,
	"notes" text,
	"source" text,
	"source_scale" text,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
