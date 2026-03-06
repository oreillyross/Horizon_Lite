CREATE TABLE "gdelt_events" (
	"global_event_id" text PRIMARY KEY NOT NULL,
	"event_time" timestamp with time zone,
	"actor1_name" text,
	"actor2_name" text,
	"event_code" text,
	"quad_class" integer,
	"goldstein" double precision,
	"avg_tone" double precision,
	"num_mentions" integer,
	"num_sources" integer,
	"num_articles" integer,
	"action_geo_fullname" text,
	"action_geo_country_code" text,
	"action_geo_lat" double precision,
	"action_geo_lon" double precision,
	"source_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdelt_event_mentions" (
	"id" text PRIMARY KEY NOT NULL,
	"global_event_id" text NOT NULL,
	"mention_time" timestamp with time zone,
	"domain" text,
	"url" text NOT NULL,
	"confidence" integer,
	"doc_tone" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gdelt_documents" (
	"url" text PRIMARY KEY NOT NULL,
	"domain" text,
	"published_at" timestamp with time zone,
	"title" text,
	"image_url" text,
	"tone" double precision,
	"themes" text[] DEFAULT '{}' NOT NULL,
	"organizations" text[] DEFAULT '{}' NOT NULL,
	"raw_extras_xml" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gdelt_event_mentions" ADD CONSTRAINT "gdelt_event_mentions_global_event_id_gdelt_events_global_event_id_fk" FOREIGN KEY ("global_event_id") REFERENCES "public"."gdelt_events"("global_event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gdelt_events_event_time_idx" ON "gdelt_events" USING btree ("event_time");--> statement-breakpoint
CREATE INDEX "gdelt_events_event_code_idx" ON "gdelt_events" USING btree ("event_code");--> statement-breakpoint
CREATE INDEX "gdelt_events_actor1_idx" ON "gdelt_events" USING btree ("actor1_name");--> statement-breakpoint
CREATE INDEX "gdelt_events_actor2_idx" ON "gdelt_events" USING btree ("actor2_name");--> statement-breakpoint
CREATE UNIQUE INDEX "gdelt_event_mentions_event_url_uq" ON "gdelt_event_mentions" USING btree ("global_event_id","url");--> statement-breakpoint
CREATE INDEX "gdelt_event_mentions_url_idx" ON "gdelt_event_mentions" USING btree ("url");--> statement-breakpoint
CREATE INDEX "gdelt_event_mentions_event_idx" ON "gdelt_event_mentions" USING btree ("global_event_id");--> statement-breakpoint
CREATE INDEX "gdelt_documents_published_idx" ON "gdelt_documents" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "gdelt_documents_domain_idx" ON "gdelt_documents" USING btree ("domain");