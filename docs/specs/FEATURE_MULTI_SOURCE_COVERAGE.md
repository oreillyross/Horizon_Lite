# Feature: Multi-Source Coverage Analysis
**Status**: Spec | **Priority**: Medium | **Scope**: Vertical Slice

---

## Overview
Add a "Coverage" tab to the intelfeed event detail view that aggregates and clusters headlines across all sources reporting an event. Users can explore narrative diversity, source reach, and framing variations without manually scanning 50+ articles.

**Core insight**: A single geopolitical event often gets reported with different framings across sources. This view surfaces those framings as data, enabling analysts to detect disinformation, propaganda, or genuine consensus.

---

## User Stories

### 1. Analyst Discovers Narrative Splits
> As an analyst monitoring a hybrid warfare indicator, I want to see if multiple sources report the same event with contradictory framings, so I can flag potential disinformation or coordinated narrative control.

**Acceptance Criteria**:
- Coverage tab shows ≥2 headline clusters for an event
- Each cluster displays mention count and representative headline
- Analyst can expand cluster to see all grouped headlines
- Clusters are sorted by mention count (descending)

### 2. Analyst Surveys Coverage Reach
> As an analyst, I want to know how widely an event was reported (source count, geographic spread), so I can assess whether it's a localized incident or global signal.

**Acceptance Criteria**:
- Coverage header displays total mention count and unique source count
- Source domain list is accessible (e.g., "BBC, Reuters, AP, ...+44 more")
- At minimum, mention count and tone/intensity bubbled up from event

### 3. Analyst Expands a Headline Cluster
> As an analyst, I want to click a cluster to see all articles in that group, so I can verify the clustering is semantically correct and spot outliers.

**Acceptance Criteria**:
- Clicking a cluster expands inline to show all headlines + source + URL
- Expanded view shows article source domain (e.g., "bbc.co.uk")
- URL is clickable/copyable (link to original article)
- Collapse button to minimize again

---

## Technical Requirements

### Data Model
- **Input**: `gdelt_event_mentions` join table + `gdelt_mentions` table with URLs and titles
- **New computed field**: `headline_clusters` (JSON array of clustered groups)
- **Clustering**: Client-side headline embedding + similarity grouping
  - Embedding model: `Xenova/all-MiniLM-L6-v2` (lightweight, runs in browser)
  - Similarity threshold: cosine distance ≤ 0.3 (tunable)
  - Min cluster size: 2 headlines (avoid singleton "clusters")

### API Changes
**Endpoint**: `GET /api/events/:eventId/coverage`

**Response**:
```typescript
{
  eventId: string;
  mentionCount: number;
  sourceCount: number;
  headlines: Array<{
    id: string;
    title: string;
    source: string; // domain only (e.g., "bbc.co.uk")
    url: string;
    createdAt: ISO8601;
  }>;
  clusters: Array<{
    id: string;
    size: number;
    representative: string; // most common headline in cluster
    headlines: string[]; // all headline IDs in cluster
    embedding?: number[]; // optional, for debugging
  }>;
}
```

### Frontend: Coverage Tab Component

**Location**: `src/components/intelfeed/EventDetailCoverageTab.tsx`

**Structure**:
```
┌─ Coverage Header ─────────────────────┐
│ 47 mentions | 44 sources | Tone: -2.5 │
│ [Sources: BBC, Reuters, AP, +41...]    │
└───────────────────────────────────────┘

┌─ Cluster 1 [COLLAPSED] ───────────────┐
│ [23 sources]                           │
│ "Woman stabbed in murder trial..." ▼   │
└───────────────────────────────────────┘

┌─ Cluster 1 [EXPANDED] ─────────────────────┐
│ [23 sources]                               │
│ "Woman stabbed in murder trial..." ▲       │
│                                             │
│ • Daily Mail: Woman stabbed in murder... ✚ │
│ • Sky News: Murder trial: Woman stabbed... ✚ │
│ • ITV News: Stabbing case heard in court... ✚ │
│ • [+20 more articles]                       │
│                                             │
│ [Show all 23 articles]                      │
└─────────────────────────────────────────────┘

┌─ Cluster 2 [COLLAPSED] ───────────────┐
│ [15 sources]                           │
│ "Defense argues self-defense claim..." ▼   │
└───────────────────────────────────────┘

┌─ Cluster 3 [COLLAPSED] ───────────────┐
│ [9 sources]                            │
│ "Jewelry theft murder case..." ▼       │
└───────────────────────────────────────┘
```

**Interactions**:
- Click cluster header to toggle expand/collapse
- Click `✚` on article to open in new tab
- "Show all X articles" link expands full list (pagination or virtualization for >30)
- Hover source domain to show country flag (optional enhancement)

### Frontend: Source Country Flags
```typescript
// Map domain TLD/metadata to country flag
// Options (in order of preference):
// 1. TLD-based: bbc.co.uk → .uk → 🇬🇧 (simple, fast, >90% accurate)
// 2. Hardcoded mapping: { 'bbc.co.uk': '🇬🇧', 'reuters.com': '🇨🇦', ... }
// 3. Library: npm install flag-emoji (or similar)

// Recommended: TLD mapping + hardcoded overrides for multi-country outlets
const domainToFlag = (domain: string): string => {
  const tldMap: Record<string, string> = {
    'uk': '🇬🇧', 'us': '🇺🇸', 'de': '🇩🇪', 'fr': '🇫🇷', 'ru': '🇷🇺',
    'cn': '🇨🇳', 'in': '🇮🇳', 'br': '🇧🇷', 'jp': '🇯🇵', 'au': '🇦🇺',
    // ... expand as needed
  };
  
  const overrides: Record<string, string> = {
    'reuters.com': '🇨🇦',      // Reuters HQ Canada
    'apnews.com': '🇺🇸',       // AP US
    'bbc.com': '🇬🇧',          // BBC UK
  };
  
  if (overrides[domain]) return overrides[domain];
  const tld = domain.split('.').pop();
  return tldMap[tld!] || '🌍'; // fallback global
};
```

**Display**: `🇬🇧 bbc.co.uk` in article list (flag + domain, no crowding)

### Frontend: Embedding & Clustering (Client-side)
```typescript
// pseudocode
import { env } from '@xenova/transformers';

async function clusterHeadlines(headlines: string[]): Promise<ClusterGroup[]> {
  // 1. Load model (one-time in component lifecycle)
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  
  // 2. Embed all headlines
  const embeddings = await Promise.all(
    headlines.map(h => extractor(h, { pooling: 'mean' }))
  );
  
  // 3. Compute pairwise similarity (cosine distance)
  // 4. Greedy cluster assignment (threshold = 0.3)
  // 5. Return cluster groups with representative headline
  
  return clusters;
}
```

**Performance notes**:
- Embedding 50 headlines with MiniLM: ~500-800ms (first load), ~50ms cached
- WASM model loads once per session
- Consider showing skeleton state while embedding runs

### Backend: Optional Caching Layer
If you want to pre-compute clusters (cost optimization):
- **Job**: Daily batch job that clusters all events with >10 mentions
- **Storage**: Cache clusters in `gdelt_events.coverage_clusters` (JSON)
- **API**: Serve from cache if fresh (<24h), else compute on-demand
- **Trade-off**: Freshness vs. zero embedding computation

**Recommended for MVP**: Compute on-demand (client-side), cache in browser localStorage per session.

---

## UI Wireframe Details

### Coverage Header
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📰 Coverage Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
47 total mentions | 44 unique sources
Tone: -2.5 | Coverage span: 6 hours

Sources: BBC, Reuters, AP, ITV News, Sky News, Daily Mail, ...+39 more
```

### Cluster Item (Collapsed)
```
┌─────────────────────────────────────────────────┐
│ [23] Woman stabbed in murder trial...  [▼]      │
└─────────────────────────────────────────────────┘
```

### Cluster Item (Expanded, First 5 + Show More)
```
┌─────────────────────────────────────────────────┐
│ [23] Woman stabbed in murder trial...  [▲]      │
│                                                  │
│ • Daily Mail                                     │
│   Woman stabbed in film director's sister...    │
│   https://dailymail.co.uk/...              [↗]  │
│                                                  │
│ • Sky News                                       │
│   Murder trial hears of stabbing...             │
│   https://sky.com/...                      [↗]  │
│                                                  │
│ • BBC News                                       │
│   Court told of fatal stabbing incident...      │
│   https://bbc.com/...                      [↗]  │
│                                                  │
│ [Show all 23 articles ↓]                        │
└─────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: MVP (Lowest Cost)
- [x] Design Coverage tab component structure
- [ ] Implement headline clustering (client-side embedding)
- [ ] Build cluster expand/collapse UI
- [ ] Add coverage header (mention count, source count, tone)
- [ ] Wire to existing event detail view
- [ ] Manual QA on 5-10 high-mention events

**Deliverable**: Coverage tab shows clusters, user can expand/collapse and open articles. No caching, no optimization.

### Phase 2: Polish & Performance
- [ ] Add skeleton loaders while embedding runs
- [ ] Implement article expand-all with virtualization (50+ articles)
- [ ] Add source country flags (optional)
- [ ] Test embedding performance on mobile
- [ ] Browser localStorage caching of clusters per session

**Deliverable**: Smooth UX, fast response times, mobile-friendly.

### Phase 3: Optional Enhancements
- [ ] Backend caching of clusters (batch job for high-mention events)
- [ ] Narrative divergence scoring (flag outlier clusters)
- [ ] Timeline view (mentions over time per cluster)
- [ ] Export cluster summary as briefing section

**Deliverable**: Advanced analyst workflows, performance at scale.

---

## Edge Cases & Constraints

| Case | Handling |
|------|----------|
| Event has <5 mentions | Don't show Coverage tab (not enough signal) |
| All headlines are identical | Show 1 cluster with all mentions grouped |
| Embedding model fails to load | Graceful fallback: show raw list of articles, unsorted |
| >100 mentions | Virtualize article list, show "Show all 103 articles" pagination |
| Mobile view | Stack clusters vertically, truncate long headlines with ellipsis, responsive expand |
| GDELT mentions have no titles | Use first 50 chars of URL or "(untitled)" placeholder |

---

## Success Metrics

1. **Adoption**: Coverage tab clicked on ≥30% of high-mention events (>15 mentions)
2. **Utility**: Analysts flag ≥2 narrative clusters per week as signaling (disinformation/consensus divergence)
3. **Performance**: Embedding + clustering completes in <1.5s for 50 headlines
4. **Correctness**: Manual review of 10 clustered events shows ≥85% semantic accuracy

---

## Dependencies

- **Frontend**: `@xenova/transformers` (feature-extraction pipeline)
- **API**: Existing `gdelt_event_mentions` + `gdelt_mentions` tables
- **Styling**: shadcn/ui Accordion component (or custom if needed)

---

## Design Decisions (Locked)

1. **Coverage tab visibility**: Show only for events with >15 mentions (filters noise, keeps intelfeed clean)
2. **Source country flags**: Yes—adds visual context & geopolitical signal without crowding (flag + domain, e.g., 🇬🇧 bbc.co.uk)
3. **Cluster representative headline**: Most common (most frequent occurrence across sources)—zero API cost, honest representation of outlet emphasis
4. **Similarity threshold**: 0.3 (moderate; clusters similar framings without over-grouping)

---

## Related Features

- **Event Detail View**: Parent component housing Coverage tab
- **Intelfeed Signal Generator**: Consider flagging events with narrative divergence as "high-signal"
- **Weekly Briefing**: Export coverage summary as briefing section (Phase 3)
