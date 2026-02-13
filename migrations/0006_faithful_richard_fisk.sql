CREATE TABLE "theme_group_links" (
	"theme_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "theme_group_links_theme_id_group_id_pk" PRIMARY KEY("theme_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "snippet_group_links" (
	"snippet_id" varchar NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "snippet_group_links_snippet_id_group_id_pk" PRIMARY KEY("snippet_id","group_id")
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "analyst_group_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "theme_group_links" ADD CONSTRAINT "theme_group_links_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_group_links" ADD CONSTRAINT "theme_group_links_group_id_analyst_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."analyst_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_group_links" ADD CONSTRAINT "snippet_group_links_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_group_links" ADD CONSTRAINT "snippet_group_links_group_id_analyst_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."analyst_groups"("id") ON DELETE cascade ON UPDATE no action;