CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analyst_group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_analyst_group_id_analyst_groups_id_fk" FOREIGN KEY ("analyst_group_id") REFERENCES "public"."analyst_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scenarios_group_id_idx" ON "scenarios" USING btree ("analyst_group_id");--> statement-breakpoint
CREATE INDEX "gdelt_events_num_mentions_idx" ON "gdelt_events" USING btree ("num_mentions");