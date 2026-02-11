CREATE TABLE "recent_source_items" (
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
CREATE TABLE "recent_sources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snippets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content" text NOT NULL,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"source_url" text,
	"source_title" text,
	"source_host" text,
	"theme_id" uuid
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"synopsis" text,
	"synopsis_updated_at" timestamp with time zone,
	"synopsis_model" text,
	"synopsis_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text,
	"email" text,
	"password_hash" text,
	"role" text DEFAULT 'analyst' NOT NULL,
	"analyst_group_id" uuid,
	"created_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "recent_source_items" ADD CONSTRAINT "recent_source_items_source_id_recent_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."recent_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_source_items" ADD CONSTRAINT "recent_source_items_captured_snippet_id_snippets_id_fk" FOREIGN KEY ("captured_snippet_id") REFERENCES "public"."snippets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippets" ADD CONSTRAINT "snippets_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recent_source_items_url_unique" ON "recent_source_items" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "themes_name_unique" ON "themes" USING btree ("name");