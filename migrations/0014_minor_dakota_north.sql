CREATE TABLE "event_codes" (
	"code" varchar(4) PRIMARY KEY NOT NULL,
	"parent_code" varchar(4),
	"name" text NOT NULL,
	"description" text,
	"level" integer NOT NULL,
	"quad_class" integer,
	"goldstein_score" real
);
--> statement-breakpoint
ALTER TABLE "gdelt_events" ALTER COLUMN "event_code" SET DATA TYPE varchar(4);