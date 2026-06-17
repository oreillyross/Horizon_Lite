CREATE TABLE IF NOT EXISTS "recent_source_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" varchar NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"published_at" timestamp,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"excerpt" text,
	"raw_text" text,
	"captured_at" timestamp,
	"captured_snippet_id" varchar
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recent_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snippets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"source_url" text,
	"source_title" text,
	"source_host" text,
	"theme_id" uuid,
	"quote" text,
	"pub_date" timestamp,
	"indicator_id" uuid,
	"analyst_notes" text,
	"ai_suggested_indicator_id" uuid
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"synopsis" text,
	"synopsis_updated_at" timestamp with time zone,
	"synopsis_model" text,
	"synopsis_version" integer DEFAULT 0 NOT NULL,
	"synopsis_context_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'analyst' NOT NULL,
	"analyst_group_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "analyst_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "analyst_groups_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_sessions" (
	"sid" varchar(255) PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp (6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "theme_group_links" (
	"theme_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "theme_group_links_theme_id_group_id_pk" PRIMARY KEY("theme_id","group_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snippet_group_links" (
	"snippet_id" varchar NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "snippet_group_links_snippet_id_group_id_pk" PRIMARY KEY("snippet_id","group_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recent_source_item_tags" (
	"source_item_id" varchar NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recent_source_item_tags_source_item_id_tag_id_pk" PRIMARY KEY("source_item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "snippet_tags" (
	"snippet_id" varchar NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snippet_tags_snippet_id_tag_id_pk" PRIMARY KEY("snippet_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "signal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicator_id" uuid NOT NULL,
	"source_url" text,
	"source_host" text,
	"title" text,
	"score" double precision NOT NULL,
	"confidence_score" double precision,
	"canonical_id" uuid,
	"dedupe_key" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scenario_indicator_map" (
	"scenario_id" uuid NOT NULL,
	"indicator_id" uuid NOT NULL,
	"weight" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "indicators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" uuid,
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
	"strength" integer DEFAULT 5 NOT NULL,
	"time_weight" text DEFAULT 'week' NOT NULL,
	"decay_behaviour" text DEFAULT 'linear' NOT NULL,
	"last_triggered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gdelt_events" (
	"global_event_id" text PRIMARY KEY NOT NULL,
	"event_time" timestamp with time zone,
	"actor1_name" text,
	"actor2_name" text,
	"event_code" varchar(4),
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
	"title" text,
	"source_name" text,
	"status" text DEFAULT 'new' NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gdelt_event_mentions" (
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
CREATE TABLE IF NOT EXISTS "gdelt_documents" (
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
CREATE TABLE IF NOT EXISTS "event_codes" (
	"code" varchar(4) PRIMARY KEY NOT NULL,
	"parent_code" varchar(4),
	"name" text NOT NULL,
	"description" text,
	"level" integer NOT NULL,
	"quad_class" integer,
	"goldstein_score" real
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analyst_group_id" uuid NOT NULL,
	"theme_id" uuid,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recent_source_items" ADD CONSTRAINT "recent_source_items_source_id_recent_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."recent_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_source_items" ADD CONSTRAINT "recent_source_items_captured_snippet_id_snippets_id_fk" FOREIGN KEY ("captured_snippet_id") REFERENCES "public"."snippets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippets" ADD CONSTRAINT "snippets_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippets" ADD CONSTRAINT "snippets_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippets" ADD CONSTRAINT "snippets_ai_suggested_indicator_id_indicators_id_fk" FOREIGN KEY ("ai_suggested_indicator_id") REFERENCES "public"."indicators"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_analyst_group_id_analyst_groups_id_fk" FOREIGN KEY ("analyst_group_id") REFERENCES "public"."analyst_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_group_links" ADD CONSTRAINT "theme_group_links_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_group_links" ADD CONSTRAINT "theme_group_links_group_id_analyst_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."analyst_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_group_links" ADD CONSTRAINT "snippet_group_links_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_group_links" ADD CONSTRAINT "snippet_group_links_group_id_analyst_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."analyst_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_source_item_tags" ADD CONSTRAINT "recent_source_item_tags_source_item_id_recent_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."recent_source_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_source_item_tags" ADD CONSTRAINT "recent_source_item_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_tags" ADD CONSTRAINT "snippet_tags_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_tags" ADD CONSTRAINT "snippet_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_events" ADD CONSTRAINT "signal_events_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map" ADD CONSTRAINT "scenario_indicator_map_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_indicator_map" ADD CONSTRAINT "scenario_indicator_map_indicator_id_indicators_id_fk" FOREIGN KEY ("indicator_id") REFERENCES "public"."indicators"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_analyst_group_id_analyst_groups_id_fk" FOREIGN KEY ("analyst_group_id") REFERENCES "public"."analyst_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "recent_source_items_url_unique" ON "recent_source_items" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "themes_name_unique" ON "themes" USING btree ("name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recent_source_item_tags_source_item_id_idx" ON "recent_source_item_tags" USING btree ("source_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "recent_source_item_tags_tag_id_idx" ON "recent_source_item_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snippet_tags_snippet_id_idx" ON "snippet_tags" USING btree ("snippet_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "snippet_tags_tag_id_idx" ON "snippet_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sources_url_unique" ON "sources" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "signal_events_dedupe_uq" ON "signal_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_events_event_time_idx" ON "gdelt_events" USING btree ("event_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_events_event_code_idx" ON "gdelt_events" USING btree ("event_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_events_actor1_idx" ON "gdelt_events" USING btree ("actor1_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_events_actor2_idx" ON "gdelt_events" USING btree ("actor2_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_events_num_mentions_idx" ON "gdelt_events" USING btree ("num_mentions");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "gdelt_event_mentions_event_url_uq" ON "gdelt_event_mentions" USING btree ("global_event_id","url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_event_mentions_url_idx" ON "gdelt_event_mentions" USING btree ("url");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_event_mentions_event_idx" ON "gdelt_event_mentions" USING btree ("global_event_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_documents_published_idx" ON "gdelt_documents" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "gdelt_documents_domain_idx" ON "gdelt_documents" USING btree ("domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenarios_group_id_idx" ON "scenarios" USING btree ("analyst_group_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scenarios_theme_id_idx" ON "scenarios" USING btree ("theme_id");