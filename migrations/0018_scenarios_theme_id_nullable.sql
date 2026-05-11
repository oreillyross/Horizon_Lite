ALTER TABLE "scenarios" ALTER COLUMN "theme_id" DROP NOT NULL;
ALTER TABLE "scenarios" DROP CONSTRAINT IF EXISTS "scenarios_theme_id_themes_id_fk";
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE set null ON UPDATE no action;
