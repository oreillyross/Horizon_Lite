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
ALTER TABLE "snippets" ADD COLUMN "theme_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "themes_name_unique" ON "themes" USING btree ("name");--> statement-breakpoint
ALTER TABLE "snippets" ADD CONSTRAINT "snippets_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;