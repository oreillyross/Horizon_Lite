CREATE TABLE "recent_source_item_tags" (
	"source_item_id" varchar NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recent_source_item_tags_source_item_id_tag_id_pk" PRIMARY KEY("source_item_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "snippet_tags" (
	"snippet_id" varchar NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "snippet_tags_snippet_id_tag_id_pk" PRIMARY KEY("snippet_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recent_source_item_tags" ADD CONSTRAINT "recent_source_item_tags_source_item_id_recent_source_items_id_fk" FOREIGN KEY ("source_item_id") REFERENCES "public"."recent_source_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recent_source_item_tags" ADD CONSTRAINT "recent_source_item_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_tags" ADD CONSTRAINT "snippet_tags_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_tags" ADD CONSTRAINT "snippet_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recent_source_item_tags_source_item_id_idx" ON "recent_source_item_tags" USING btree ("source_item_id");--> statement-breakpoint
CREATE INDEX "recent_source_item_tags_tag_id_idx" ON "recent_source_item_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "snippet_tags_snippet_id_idx" ON "snippet_tags" USING btree ("snippet_id");--> statement-breakpoint
CREATE INDEX "snippet_tags_tag_id_idx" ON "snippet_tags" USING btree ("tag_id");