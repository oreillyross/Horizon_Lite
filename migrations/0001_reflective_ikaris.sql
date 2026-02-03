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
ALTER TABLE "recent_source_items" ADD CONSTRAINT "recent_source_items_source_id_recent_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."recent_sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_source_items" ADD CONSTRAINT "recent_source_items_captured_snippet_id_snippets_id_fk" FOREIGN KEY ("captured_snippet_id") REFERENCES "public"."snippets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recent_source_items_url_unique" ON "recent_source_items" USING btree ("url");