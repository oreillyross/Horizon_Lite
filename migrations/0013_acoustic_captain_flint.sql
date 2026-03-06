ALTER TABLE "signal_events" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "signal_events_dedupe_uq" ON "signal_events" USING btree ("dedupe_key");