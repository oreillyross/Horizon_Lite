-- Horizon Data Lifecycle Strategy
-- PostgreSQL 13+ compatible
-- Implements 3-tier retention to keep storage bounded while preserving analyst utility

-- ============================================================================
-- TIER 1: HOT DATA (0-30 days)
-- Full fidelity, used for real-time signal detection
-- ============================================================================

-- Raw GDELT events (keep all, indexed by date + theme for fast queries)
CREATE TABLE gdelt_events_hot (
  event_id BIGINT PRIMARY KEY,
  event_date DATE NOT NULL,
  event_time INTEGER,
  actor1 VARCHAR(255),
  actor2 VARCHAR(255),
  event_code INTEGER,
  goldstein_scale FLOAT,
  num_mentions INTEGER,
  num_sources INTEGER,
  avg_tone FLOAT,
  stored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_hot_date ON gdelt_events_hot(event_date);
CREATE INDEX idx_events_hot_actors ON gdelt_events_hot(actor1, actor2);
CREATE INDEX idx_events_hot_code ON gdelt_events_hot(event_code);
CREATE INDEX idx_events_hot_goldstein ON gdelt_events_hot(goldstein_scale);

-- Mentions (raw article references)
CREATE TABLE gdelt_mentions_hot (
  mention_id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES gdelt_events_hot(event_id) ON DELETE CASCADE,
  source_url TEXT,
  mention_date DATE NOT NULL,
  avg_tone FLOAT
);

CREATE INDEX idx_mentions_hot_event_id ON gdelt_mentions_hot(event_id);
CREATE INDEX idx_mentions_hot_date ON gdelt_mentions_hot(mention_date);

-- GKG (themes, emotions, locations) - keep raw for 30 days
CREATE TABLE gdelt_gkg_hot (
  gkg_id BIGSERIAL PRIMARY KEY,
  event_date DATE NOT NULL,
  themes TEXT,  -- comma-separated theme codes
  emotions JSONB,
  locations JSONB,
  organizations TEXT,
  persons TEXT,
  stored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gkg_hot_date ON gdelt_gkg_hot(event_date);

-- Signal detections (what fired in real-time)
CREATE TABLE signals_hot (
  signal_id BIGSERIAL PRIMARY KEY,
  scenario_id INTEGER NOT NULL,
  indicator_id INTEGER NOT NULL,
  event_id BIGINT REFERENCES gdelt_events_hot(event_id) ON DELETE CASCADE,
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  signal_strength FLOAT,  -- 1-9 scale
  tone_trend FLOAT,  -- tone delta from baseline
  amplification FLOAT  -- mention spike %
);

CREATE INDEX idx_signals_hot_scenario ON signals_hot(scenario_id);
CREATE INDEX idx_signals_hot_detected ON signals_hot(detected_at);
CREATE INDEX idx_signals_hot_event ON signals_hot(event_id);

-- ============================================================================
-- TIER 2: WARM DATA (30-90 days)
-- Aggregated, indicator-focused, most GKG dropped
-- ============================================================================

-- Compressed events (only those matching an indicator)
CREATE TABLE gdelt_events_warm (
  event_id BIGINT PRIMARY KEY,
  event_date DATE NOT NULL,
  scenario_id INTEGER,  -- which scenario(s) does this belong to?
  indicator_id INTEGER,  -- which indicator triggered?
  actor1 VARCHAR(255),
  actor2 VARCHAR(255),
  goldstein_scale FLOAT,
  avg_tone FLOAT,
  num_mentions INTEGER,
  compressed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_warm_scenario_date ON gdelt_events_warm(scenario_id, event_date);
CREATE INDEX idx_events_warm_indicator ON gdelt_events_warm(indicator_id);
CREATE INDEX idx_events_warm_date ON gdelt_events_warm(event_date);

-- Mention digest (deduplicated, tone-only)
-- Using SHA1 hash of URL + event_id for deduplication
CREATE TABLE gdelt_mentions_warm (
  mention_hash CHAR(40) PRIMARY KEY,  -- SHA1 of source_url || event_id
  event_id BIGINT,
  source_url TEXT,
  mention_date DATE,
  avg_tone FLOAT
);

CREATE INDEX idx_mentions_warm_event ON gdelt_mentions_warm(event_id);

-- Daily theme rollup (pre-computed for fast aggregation)
CREATE TABLE theme_daily_rollup (
  rollup_date DATE,
  theme_code VARCHAR(50),
  scenario_id INTEGER,
  event_count INTEGER,
  avg_tone FLOAT,
  avg_goldstein FLOAT,
  PRIMARY KEY (rollup_date, theme_code, scenario_id)
);

CREATE INDEX idx_theme_rollup_scenario ON theme_daily_rollup(scenario_id, rollup_date);

-- ============================================================================
-- TIER 3: COLD DATA (90+ days)
-- Time-series snapshots, evidence archive only
-- ============================================================================

-- Scenario likelihood time-series (one row per day per scenario)
CREATE TABLE scenario_likelihood_archive (
  snapshot_date DATE,
  scenario_id INTEGER,
  likelihood_score FLOAT,  -- Bayesian posterior, 0-1
  supporting_event_count INTEGER,
  PRIMARY KEY (snapshot_date, scenario_id)
);

CREATE INDEX idx_scenario_archive_id ON scenario_likelihood_archive(scenario_id);

-- Event evidence archive (only "significant" events)
CREATE TABLE event_evidence_archive (
  event_id BIGINT PRIMARY KEY,
  scenario_id INTEGER,
  indicator_id INTEGER,
  event_date DATE,
  actor1 VARCHAR(255),
  actor2 VARCHAR(255),
  goldstein_scale FLOAT,
  avg_tone FLOAT,
  evidence_strength INTEGER,  -- 1-9, how much does this prove the indicator?
  source_urls TEXT  -- up to 3 primary sources, semicolon-separated
);

CREATE INDEX idx_evidence_archive_scenario ON event_evidence_archive(scenario_id, event_date);

-- ============================================================================
-- LIFECYCLE MANAGEMENT: Functions & Procedures
-- ============================================================================

-- Archive HOT → WARM after 30 days
CREATE OR REPLACE FUNCTION archive_warm_data()
RETURNS TABLE(status TEXT, rows_archived INTEGER) AS $$
DECLARE
  v_events_archived INTEGER;
  v_mentions_archived INTEGER;
  v_gkg_deleted INTEGER;
  v_mentions_deleted INTEGER;
  v_events_deleted INTEGER;
  v_signals_deleted INTEGER;
BEGIN
  -- Archive events that triggered a signal
  INSERT INTO gdelt_events_warm 
    (event_id, event_date, scenario_id, indicator_id, actor1, actor2, 
     goldstein_scale, avg_tone, num_mentions, compressed_at)
  SELECT DISTINCT
    e.event_id,
    e.event_date,
    s.scenario_id,
    s.indicator_id,
    e.actor1,
    e.actor2,
    e.goldstein_scale,
    e.avg_tone,
    e.num_mentions,
    NOW()
  FROM gdelt_events_hot e
  INNER JOIN signals_hot s ON e.event_id = s.event_id
  WHERE e.event_date < CURRENT_DATE - INTERVAL '30 days'
    AND e.event_id NOT IN (SELECT event_id FROM gdelt_events_warm)
  ON CONFLICT (event_id) DO UPDATE SET compressed_at = NOW();

  v_events_archived := FOUND::INTEGER;

  -- Compress mentions for warm data (deduplicate by URL hash)
  INSERT INTO gdelt_mentions_warm 
    (mention_hash, event_id, source_url, mention_date, avg_tone)
  SELECT
    encode(digest(source_url || gm.event_id::TEXT, 'sha1'), 'hex'),
    gm.event_id,
    gm.source_url,
    gm.mention_date,
    gm.avg_tone
  FROM gdelt_mentions_hot gm
  WHERE gm.mention_date < CURRENT_DATE - INTERVAL '30 days'
  ON CONFLICT (mention_hash) DO UPDATE SET avg_tone = EXCLUDED.avg_tone;

  v_mentions_archived := FOUND::INTEGER;

  -- Delete hot data older than 30 days
  DELETE FROM gdelt_gkg_hot 
  WHERE event_date < CURRENT_DATE - INTERVAL '30 days';
  v_gkg_deleted := ROW_COUNT;

  DELETE FROM gdelt_mentions_hot 
  WHERE mention_date < CURRENT_DATE - INTERVAL '30 days';
  v_mentions_deleted := ROW_COUNT;

  DELETE FROM gdelt_events_hot 
  WHERE event_date < CURRENT_DATE - INTERVAL '30 days';
  v_events_deleted := ROW_COUNT;

  -- Signal archive cleanup (keep summaries, drop raw signals after 30 days)
  DELETE FROM signals_hot 
  WHERE detected_at < NOW() - INTERVAL '30 days';
  v_signals_deleted := ROW_COUNT;

  RETURN QUERY 
    SELECT 
      'archive_warm_data: SUCCESS - events archived: ' || v_events_archived 
      || ', mentions archived: ' || v_mentions_archived 
      || ', deleted: ' || v_events_deleted || ' events',
      v_events_archived + v_mentions_archived;

END;
$$ LANGUAGE plpgsql;

-- Archive WARM → COLD after 90 days
CREATE OR REPLACE FUNCTION archive_cold_data()
RETURNS TABLE(status TEXT, rows_archived INTEGER) AS $$
DECLARE
  v_snapshots_archived INTEGER;
  v_evidence_archived INTEGER;
  v_mentions_deleted INTEGER;
  v_events_deleted INTEGER;
BEGIN
  -- Time-series snapshot: daily scenario likelihood
  INSERT INTO scenario_likelihood_archive 
    (snapshot_date, scenario_id, likelihood_score, supporting_event_count)
  SELECT
    CURRENT_DATE - INTERVAL '1 day',
    s.scenario_id,
    AVG(s.signal_strength) / 9.0,  -- normalize 1-9 to 0-1
    COUNT(DISTINCT s.event_id)
  FROM signals_hot s
  WHERE DATE(s.detected_at) = CURRENT_DATE - INTERVAL '1 day'
  GROUP BY s.scenario_id
  ON CONFLICT (snapshot_date, scenario_id) 
    DO UPDATE SET 
      likelihood_score = EXCLUDED.likelihood_score,
      supporting_event_count = EXCLUDED.supporting_event_count;

  v_snapshots_archived := FOUND::INTEGER;

  -- Archive significant events only (high tone or extreme Goldstein)
  INSERT INTO event_evidence_archive 
    (event_id, scenario_id, indicator_id, event_date, actor1, actor2, 
     goldstein_scale, avg_tone, evidence_strength, source_urls)
  SELECT
    ew.event_id,
    ew.scenario_id,
    ew.indicator_id,
    ew.event_date,
    ew.actor1,
    ew.actor2,
    ew.goldstein_scale,
    ew.avg_tone,
    LEAST(9, CEIL(ABS(ew.avg_tone) / 20)::INTEGER),  -- convert tone to strength 1-9
    STRING_AGG(DISTINCT gm.source_url, '; ')
  FROM gdelt_events_warm ew
  LEFT JOIN gdelt_mentions_warm gm ON ew.event_id = gm.event_id
  WHERE ew.compressed_at < CURRENT_DATE - INTERVAL '90 days'
    AND (ABS(ew.avg_tone) > 40 OR ABS(ew.goldstein_scale) > 5)
    AND ew.event_id NOT IN (SELECT event_id FROM event_evidence_archive)
  GROUP BY ew.event_id, ew.scenario_id, ew.indicator_id, ew.event_date, 
           ew.actor1, ew.actor2, ew.goldstein_scale, ew.avg_tone
  ON CONFLICT (event_id) DO UPDATE SET source_urls = EXCLUDED.source_urls;

  v_evidence_archived := FOUND::INTEGER;

  -- Delete warm data older than 90 days
  DELETE FROM gdelt_mentions_warm 
  WHERE mention_date < CURRENT_DATE - INTERVAL '90 days';
  v_mentions_deleted := ROW_COUNT;

  DELETE FROM gdelt_events_warm 
  WHERE compressed_at < CURRENT_DATE - INTERVAL '90 days';
  v_events_deleted := ROW_COUNT;

  RETURN QUERY 
    SELECT 
      'archive_cold_data: SUCCESS - snapshots: ' || v_snapshots_archived 
      || ', evidence: ' || v_evidence_archived 
      || ', deleted: ' || v_events_deleted || ' warm events',
      v_snapshots_archived + v_evidence_archived;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MONITORING: Check storage size per tier
-- ============================================================================

CREATE OR REPLACE FUNCTION check_storage_usage()
RETURNS TABLE(tier TEXT, size_mb NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'HOT'::TEXT,
    ROUND(SUM(pg_total_relation_size(schemaname||'.'||tablename))::NUMERIC / 1024 / 1024, 2)
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('gdelt_events_hot', 'gdelt_mentions_hot', 'gdelt_gkg_hot', 'signals_hot')

  UNION ALL

  SELECT 
    'WARM'::TEXT,
    ROUND(SUM(pg_total_relation_size(schemaname||'.'||tablename))::NUMERIC / 1024 / 1024, 2)
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('gdelt_events_warm', 'gdelt_mentions_warm', 'theme_daily_rollup')

  UNION ALL

  SELECT 
    'COLD'::TEXT,
    ROUND(SUM(pg_total_relation_size(schemaname||'.'||tablename))::NUMERIC / 1024 / 1024, 2)
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('scenario_likelihood_archive', 'event_evidence_archive');
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER: Table maintenance (VACUUM and ANALYZE)
-- ============================================================================

CREATE OR REPLACE FUNCTION maintenance_tables()
RETURNS TEXT AS $$
BEGIN
  VACUUM ANALYZE gdelt_events_hot;
  VACUUM ANALYZE gdelt_mentions_hot;
  VACUUM ANALYZE signals_hot;
  VACUUM ANALYZE gdelt_events_warm;
  VACUUM ANALYZE gdelt_mentions_warm;
  VACUUM ANALYZE scenario_likelihood_archive;
  VACUUM ANALYZE event_evidence_archive;

  RETURN 'Maintenance complete: VACUUM ANALYZE on all tables';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CRON SCHEDULING
-- ============================================================================
-- 
-- Use pg_cron extension (install: CREATE EXTENSION pg_cron;)
-- Then schedule daily runs:
--
-- SELECT cron.schedule('archive_warm_daily', '0 2 * * *', 'SELECT archive_warm_data()');
-- SELECT cron.schedule('archive_cold_daily', '0 3 * * *', 'SELECT archive_cold_data()');
-- SELECT cron.schedule('maintenance_daily', '0 4 * * *', 'SELECT maintenance_tables()');
--
-- Or use system crontab:
-- 0 2 * * * psql -U postgres -d horizon -c "SELECT archive_warm_data();"
-- 0 3 * * * psql -U postgres -d horizon -c "SELECT archive_cold_data();"
-- 0 4 * * * psql -U postgres -d horizon -c "SELECT maintenance_tables();"

-- SELECT cron.unschedule('archive_warm');  -- Remove the job
-- SELECT * FROM cron.job;  -- View all scheduled jobs