-- Horizon Analyst Query Patterns (PostgreSQL)
-- How analysts interrogate data at each lifecycle tier

-- ============================================================================
-- ANALYST PATTERN 1: "Show me signals from the last 24 hours"
-- → Query: HOT data (real-time, highest fidelity)
-- ============================================================================

SELECT
  s.signal_id,
  sc.scenario_name,
  ind.indicator_name,
  s.detected_at,
  s.signal_strength,
  s.tone_trend,
  s.amplification,
  COUNT(DISTINCT je.event_id) as event_count,
  STRING_AGG(DISTINCT CONCAT(je.actor1, ':', je.actor2), '; ') as actors
FROM signals_hot s
-- JOIN scenarios sc ON s.scenario_id = sc.scenario_id
-- JOIN indicators ind ON s.indicator_id = ind.indicator_id
LEFT JOIN gdelt_events_hot je ON je.event_id = s.event_id
WHERE s.detected_at >= NOW() - INTERVAL '24 hours'
GROUP BY s.signal_id, sc.scenario_id, ind.indicator_id, s.detected_at, s.signal_strength, s.tone_trend, s.amplification
ORDER BY s.detected_at DESC;

-- ============================================================================
-- ANALYST PATTERN 2: "Show me events for [Scenario] over the last 7 days"
-- → Query: HOT data (full events + mentions + tone)
-- ============================================================================

SELECT
  je.event_id,
  je.event_date,
  je.actor1,
  je.actor2,
  je.goldstein_scale,
  je.avg_tone,
  je.num_mentions,
  COUNT(gm.mention_id) as mention_count,
  AVG(gm.avg_tone) as mention_avg_tone,
  STRING_AGG(DISTINCT gm.source_url, '; ' ORDER BY gm.source_url LIMIT 3) as top_sources
FROM gdelt_events_hot je
LEFT JOIN gdelt_mentions_hot gm ON je.event_id = gm.event_id
WHERE je.event_date >= CURRENT_DATE - INTERVAL '7 days'
  AND je.event_code IN (
    -- Event codes for "Russian military" scenario (example)
    -- SELECT event_code FROM indicator_event_mappings 
    -- WHERE indicator_id = 42
    100, 101, 102  -- placeholder
  )
GROUP BY je.event_id, je.event_date, je.actor1, je.actor2, je.goldstein_scale, je.avg_tone, je.num_mentions
ORDER BY je.event_date DESC, ABS(je.goldstein_scale) DESC;

-- ============================================================================
-- ANALYST PATTERN 3: "Backtest scenario over 60 days"
-- → Query: HOT + WARM data (hybrid for mid-range analysis)
-- ============================================================================

-- Build a virtual table merging hot & warm
SELECT
  'HOT'::TEXT as tier,
  je.event_id,
  je.event_date,
  je.goldstein_scale,
  je.avg_tone,
  je.num_mentions,
  je.actor1,
  je.actor2
FROM gdelt_events_hot je
WHERE je.event_date >= CURRENT_DATE - INTERVAL '30 days'
  -- AND je.scenario_id = 5  -- "Russian Military Posture"

UNION ALL

SELECT
  'WARM'::TEXT as tier,
  ew.event_id,
  ew.event_date,
  ew.goldstein_scale,
  ew.avg_tone,
  ew.num_mentions,
  ew.actor1,
  ew.actor2
FROM gdelt_events_warm ew
WHERE ew.event_date >= CURRENT_DATE - INTERVAL '60 days'
  AND ew.event_date < CURRENT_DATE - INTERVAL '30 days'
  -- AND ew.scenario_id = 5

ORDER BY event_date DESC;

-- ============================================================================
-- ANALYST PATTERN 4: "Show me the likelihood trend for [Scenario] over 6 months"
-- → Query: COLD data (fast, lightweight, time-series)
-- ============================================================================

WITH scenario_trends AS (
  SELECT
    snapshot_date,
    scenario_id,
    likelihood_score,
    supporting_event_count,
    -- Calculate 7-day moving average
    AVG(likelihood_score) OVER (
      PARTITION BY scenario_id 
      ORDER BY snapshot_date 
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as likelihood_7day_ma,
    -- Detect inflection points
    CASE
      WHEN likelihood_score > LAG(likelihood_score) OVER (
        PARTITION BY scenario_id ORDER BY snapshot_date
      ) * 1.2 THEN 'SPIKE'
      WHEN likelihood_score < LAG(likelihood_score) OVER (
        PARTITION BY scenario_id ORDER BY snapshot_date
      ) * 0.8 THEN 'DROP'
      ELSE 'STABLE'
    END as trend
  FROM scenario_likelihood_archive
  WHERE scenario_id = 5  -- Replace with actual scenario_id
    AND snapshot_date >= CURRENT_DATE - INTERVAL '6 months'
)
SELECT
  snapshot_date,
  scenario_id,
  likelihood_score,
  likelihood_7day_ma,
  supporting_event_count,
  trend
FROM scenario_trends
ORDER BY snapshot_date DESC;

-- ============================================================================
-- ANALYST PATTERN 5: "Prove [Scenario] happened by showing evidence chain"
-- → Query: COLD archive (sparse, high-signal evidence only)
-- ============================================================================

WITH scenario_events AS (
  SELECT
    event_id,
    scenario_id,
    indicator_id,
    event_date,
    actor1,
    actor2,
    goldstein_scale,
    avg_tone,
    evidence_strength,
    source_urls,
    ROW_NUMBER() OVER (
      PARTITION BY scenario_id 
      ORDER BY event_date ASC
    ) as event_sequence
  FROM event_evidence_archive
  WHERE scenario_id = 5  -- Replace with actual scenario_id
    AND event_date >= CURRENT_DATE - INTERVAL '6 months'
)
SELECT
  event_sequence,
  event_date,
  actor1,
  actor2,
  goldstein_scale,
  avg_tone,
  evidence_strength,
  -- Show days from prior event
  (LAG(event_date) OVER (PARTITION BY scenario_id ORDER BY event_date) - event_date)::INT as days_from_prior_event,
  source_urls
FROM scenario_events
ORDER BY event_date ASC;

-- ============================================================================
-- ANALYST PATTERN 6: "What indicators are strengthening right now?"
-- → Query: HOT data (real-time, combined with warm baseline)
-- ============================================================================

WITH recent_signals AS (
  SELECT
    s.indicator_id,
    -- ind.indicator_name,
    COUNT(*) as signal_count,
    MAX(s.detected_at) as last_signal,
    AVG(s.signal_strength) as avg_strength,
    EXTRACT(EPOCH FROM (NOW() - MAX(s.detected_at))) / 3600 as hours_since_last
  FROM signals_hot s
  -- JOIN indicators ind ON s.indicator_id = ind.indicator_id
  WHERE s.detected_at >= NOW() - INTERVAL '72 hours'
  GROUP BY s.indicator_id
),
baseline_signals AS (
  SELECT
    indicator_id,
    COUNT(*) as baseline_count
  FROM signals_hot
  WHERE detected_at >= NOW() - INTERVAL '30 days' - INTERVAL '72 hours'
    AND detected_at < NOW() - INTERVAL '30 days'
  GROUP BY indicator_id
)
SELECT
  rs.indicator_id,
  -- rs.indicator_name,
  rs.signal_count,
  COALESCE(bs.baseline_count, 0) as baseline_signal_count,
  rs.avg_strength,
  rs.last_signal,
  ROUND(rs.hours_since_last::NUMERIC) as hours_since_last,
  CASE
    WHEN bs.baseline_count > 0 
      THEN ROUND(100 * (rs.signal_count - bs.baseline_count)::NUMERIC / bs.baseline_count, 1)
      ELSE 999  -- new indicator
  END as pct_change_from_baseline
FROM recent_signals rs
LEFT JOIN baseline_signals bs ON rs.indicator_id = bs.indicator_id
WHERE rs.signal_count > 2
  OR COALESCE(bs.baseline_count, 0) = 0  -- new signals
ORDER BY pct_change_from_baseline DESC;

-- ============================================================================
-- ANALYST PATTERN 7: "Show me conflicting signals"
-- → Query: HOT data (contradiction detection)
-- ============================================================================

-- Find scenarios where one indicator says "likely" and another says "unlikely"
WITH signal_pairs AS (
  SELECT
    s1.scenario_id,
    s1.indicator_id as bullish_indicator,
    s1.avg_signal_strength as bullish_strength,
    MAX(s1.detected_at) as bullish_last_signal,
    s2.indicator_id as bearish_indicator,
    s2.avg_signal_strength as bearish_strength,
    MAX(s2.detected_at) as bearish_last_signal
  FROM (
    SELECT
      s.scenario_id,
      s.indicator_id,
      AVG(s.signal_strength) as avg_signal_strength,
      MAX(s.detected_at) as detected_at
    FROM signals_hot s
    WHERE s.detected_at >= NOW() - INTERVAL '7 days'
    GROUP BY s.scenario_id, s.indicator_id
  ) s1
  CROSS JOIN (
    SELECT
      s.scenario_id,
      s.indicator_id,
      AVG(s.signal_strength) as avg_signal_strength,
      MAX(s.detected_at) as detected_at
    FROM signals_hot s
    WHERE s.detected_at >= NOW() - INTERVAL '7 days'
    GROUP BY s.scenario_id, s.indicator_id
  ) s2
  WHERE s1.scenario_id = s2.scenario_id
    AND s1.indicator_id < s2.indicator_id  -- avoid duplicate pairs
    AND ABS(s1.avg_signal_strength - s2.avg_signal_strength) > 3  -- significant disagreement
  GROUP BY s1.scenario_id, s1.indicator_id, s1.avg_signal_strength, s2.indicator_id, s2.avg_signal_strength
)
SELECT
  scenario_id,
  bullish_indicator,
  ROUND(bullish_strength::NUMERIC, 2) as bullish_strength,
  bullish_last_signal,
  bearish_indicator,
  ROUND(bearish_strength::NUMERIC, 2) as bearish_strength,
  bearish_last_signal,
  (bullish_last_signal - bearish_last_signal) as signal_time_delta
FROM signal_pairs
ORDER BY scenario_id;

-- ============================================================================
-- ADMIN PATTERN: "Storage usage per tier"
-- ============================================================================

SELECT * FROM check_storage_usage();

-- ============================================================================
-- HELPER: Count events by scenario (for dashboard)
-- ============================================================================

SELECT
  scenario_id,
  COUNT(DISTINCT event_id) as total_events,
  COUNT(DISTINCT DATE(event_date)) as days_with_events,
  MIN(event_date) as first_event,
  MAX(event_date) as last_event,
  ROUND(AVG(avg_tone)::NUMERIC, 2) as avg_tone,
  ROUND(AVG(goldstein_scale)::NUMERIC, 2) as avg_goldstein
FROM (
  SELECT scenario_id, event_id, event_date, avg_tone, goldstein_scale 
  FROM gdelt_events_hot
  WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'

  UNION ALL

  SELECT scenario_id, event_id, event_date, avg_tone, goldstein_scale 
  FROM gdelt_events_warm
  WHERE event_date >= CURRENT_DATE - INTERVAL '30 days'
) all_events
GROUP BY scenario_id
ORDER BY total_events DESC;

-- ============================================================================
-- HELPER: Event search by actor + date range
-- ============================================================================

CREATE OR REPLACE FUNCTION search_events_by_actor(
  p_actor VARCHAR,
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE(
  event_id BIGINT,
  event_date DATE,
  actor1 VARCHAR,
  actor2 VARCHAR,
  goldstein FLOAT,
  tone FLOAT,
  mentions INTEGER,
  sources TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    je.event_id,
    je.event_date,
    je.actor1,
    je.actor2,
    je.goldstein_scale,
    je.avg_tone,
    je.num_mentions,
    STRING_AGG(DISTINCT gm.source_url, '; ')
  FROM gdelt_events_hot je
  LEFT JOIN gdelt_mentions_hot gm ON je.event_id = gm.event_id
  WHERE (je.actor1 ILIKE '%' || p_actor || '%' OR je.actor2 ILIKE '%' || p_actor || '%')
    AND je.event_date >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
  GROUP BY je.event_id, je.event_date, je.actor1, je.actor2, je.goldstein_scale, je.avg_tone, je.num_mentions
  ORDER BY je.event_date DESC;
END;
$$ LANGUAGE plpgsql;

-- Usage: SELECT * FROM search_events_by_actor('Russia', 30);