/*
 * ADR — Second ingest source: ACLED (Armed Conflict Location & Event Data)
 *
 * ACLED was chosen over the GDELT GKG v2 document stream because GDELT's GKG feed is already
 * consumed by the existing gdeltIngest adapter, making it a redundant rather than additive second
 * source. ACLED fills a data-quality gap: where GDELT derives event signals from raw media volume
 * and tone, ACLED provides researcher-validated, ground-truth conflict events (battles, protests,
 * explosions, political violence) with precise geo-coordinates, validated actor names, and fatality
 * counts. This orthogonality means GDELT catches early media-volume spikes while ACLED confirms
 * that real-world conflict events are occurring — exactly the two-step pattern Horizon uses to
 * separate weak signals from confirmed developments. The trade-off is a required API key pair
 * (ACLED_API_KEY + ACLED_EMAIL env vars, free for non-commercial research use at acleddata.com)
 * and a paginated batch API rather than a real-time stream, which fits Horizon's twice-daily
 * ingest schedule without issue.
 */

export {};
