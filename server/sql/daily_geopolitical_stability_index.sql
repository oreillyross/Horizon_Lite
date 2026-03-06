SELECT
date_trunc('day', e.published_at) as day,
avg(c.goldstein_score)
FROM gdelt_events e
JOIN event_codes c
ON c.code = e.event_code
GROUP BY day