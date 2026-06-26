CREATE TABLE IF NOT EXISTS "indicator_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"value" text NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "indicator_categories_value_unique" UNIQUE("value")
);
--> statement-breakpoint
INSERT INTO "indicator_categories" ("value", "label") VALUES
  ('political', 'Political'),
  ('infoops', 'InfoOps'),
  ('infra', 'Infrastructure'),
  ('diplomatic', 'Diplomatic')
ON CONFLICT ("value") DO NOTHING;
