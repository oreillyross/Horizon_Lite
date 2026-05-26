ALTER TABLE "signal_events"
  ADD COLUMN "canonical_id" uuid REFERENCES "signal_events"("id") ON DELETE SET NULL;
