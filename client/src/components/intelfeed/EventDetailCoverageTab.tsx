import { useState, useMemo } from "react";
import { ExternalLink, ChevronDown, ChevronUp, Newspaper, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── Domain → country flag ─────────────────────────────────────────────────────

const TLD_FLAGS: Record<string, string> = {
  uk: "🇬🇧",
  us: "🇺🇸",
  de: "🇩🇪",
  fr: "🇫🇷",
  ru: "🇷🇺",
  cn: "🇨🇳",
  in: "🇮🇳",
  br: "🇧🇷",
  jp: "🇯🇵",
  au: "🇦🇺",
  ca: "🇨🇦",
  it: "🇮🇹",
  es: "🇪🇸",
  nl: "🇳🇱",
  se: "🇸🇪",
  no: "🇳🇴",
  pl: "🇵🇱",
  ua: "🇺🇦",
  il: "🇮🇱",
  tr: "🇹🇷",
};

const DOMAIN_OVERRIDES: Record<string, string> = {
  "reuters.com": "🇨🇦",
  "apnews.com": "🇺🇸",
  "bbc.com": "🇬🇧",
  "aljazeera.com": "🇶🇦",
  "cnn.com": "🇺🇸",
  "foxnews.com": "🇺🇸",
  "nytimes.com": "🇺🇸",
  "theguardian.com": "🇬🇧",
  "washingtonpost.com": "🇺🇸",
  "dw.com": "🇩🇪",
  "france24.com": "🇫🇷",
  "rt.com": "🇷🇺",
  "tass.com": "🇷🇺",
  "xinhuanet.com": "🇨🇳",
  "globo.com": "🇧🇷",
  "timesofindia.com": "🇮🇳",
};

function domainToFlag(domain: string): string {
  if (!domain) return "🌍";
  const clean = domain.replace(/^www\./, "");
  if (DOMAIN_OVERRIDES[clean]) return DOMAIN_OVERRIDES[clean];
  const tld = clean.split(".").pop() ?? "";
  return TLD_FLAGS[tld] ?? "🌍";
}

// ── Client-side clustering (word-overlap Jaccard similarity) ──────────────────

type Headline = {
  id: string;
  title: string;
  source: string;
  url: string;
  createdAt: string | null;
};

type Cluster = {
  id: string;
  size: number;
  representative: string;
  headlines: Headline[];
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "was", "are", "were", "be", "been",
  "has", "have", "had", "it", "its", "this", "that", "as", "he", "she",
  "they", "we", "i", "not", "no", "up", "out", "if", "so", "do", "did",
  "will", "can", "may", "who", "what", "when", "where", "how", "his",
  "her", "their", "our", "my", "your", "says", "said", "say",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  const intersection = [...a].filter((w) => b.has(w)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/** Greedy single-linkage clustering with Jaccard similarity threshold. */
function clusterHeadlines(headlines: Headline[], threshold = 0.25): Cluster[] {
  const tokens = headlines.map((h) => tokenize(h.title));
  const assigned = new Array<number | null>(headlines.length).fill(null);
  const clusters: { rep: number; members: number[] }[] = [];

  for (let i = 0; i < headlines.length; i++) {
    // Find closest existing cluster where at least one member exceeds threshold
    let bestCluster = -1;
    let bestSim = 0;

    for (let ci = 0; ci < clusters.length; ci++) {
      for (const mi of clusters[ci].members) {
        const sim = jaccard(tokens[i], tokens[mi]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = ci;
        }
      }
    }

    if (bestSim >= threshold) {
      clusters[bestCluster].members.push(i);
    } else {
      clusters.push({ rep: i, members: [i] });
    }
    assigned[i] = bestCluster >= 0 && bestSim >= threshold ? bestCluster : clusters.length - 1;
  }

  // Only keep clusters with ≥2 members; singletons go into an "Other" group
  const multi = clusters.filter((c) => c.members.length >= 2);
  const singletonMembers = clusters
    .filter((c) => c.members.length < 2)
    .flatMap((c) => c.members);

  const result: Cluster[] = multi
    .sort((a, b) => b.members.length - a.members.length)
    .map((c, idx) => ({
      id: `cluster-${idx}`,
      size: c.members.length,
      representative: headlines[c.rep].title,
      headlines: c.members.map((mi) => headlines[mi]),
    }));

  if (singletonMembers.length > 0) {
    result.push({
      id: "cluster-other",
      size: singletonMembers.length,
      representative: headlines[singletonMembers[0]].title,
      headlines: singletonMembers.map((mi) => headlines[mi]),
    });
  }

  return result;
}

// ── Sub-components ────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 5;

function ClusterItem({ cluster }: { cluster: Cluster }) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const visible = showAll
    ? cluster.headlines
    : cluster.headlines.slice(0, PREVIEW_COUNT);

  return (
    <div className="rounded-lg border bg-background shadow-sm overflow-hidden">
      {/* Cluster header */}
      <button
        className="w-full flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="mt-0.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-muted text-xs font-semibold w-8 h-5 tabular-nums">
          {cluster.size}
        </span>
        <span className="flex-1 text-sm font-medium leading-snug line-clamp-2">
          {cluster.representative}
        </span>
        <span className="flex-shrink-0 text-muted-foreground mt-0.5">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      {/* Expanded article list */}
      {expanded && (
        <div className="border-t divide-y">
          {visible.map((h) => (
            <div key={h.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-shrink-0 text-base leading-none mt-0.5">
                {domainToFlag(h.source)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground">
                  {h.source}
                </div>
                <div className="mt-0.5 text-sm leading-snug">{h.title}</div>
              </div>
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                title="Open article"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}

          {cluster.headlines.length > PREVIEW_COUNT && !showAll && (
            <div className="px-4 py-3">
              <button
                onClick={() => setShowAll(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Show all {cluster.headlines.length} articles ↓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Coverage header ───────────────────────────────────────────────────────────

function CoverageHeader({
  mentionCount,
  sourceCount,
  avgTone,
  sources,
}: {
  mentionCount: number;
  sourceCount: number;
  avgTone: number | null;
  sources: string[];
}) {
  const PREVIEW_SOURCES = 6;
  const visibleSources = sources.slice(0, PREVIEW_SOURCES);
  const remaining = Math.max(0, sourceCount - PREVIEW_SOURCES);

  const toneColor =
    avgTone == null
      ? "text-muted-foreground"
      : avgTone < -5
      ? "text-red-600"
      : avgTone < -2
      ? "text-orange-500"
      : "text-emerald-600";

  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm space-y-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Newspaper className="h-4 w-4" />
        Coverage Overview
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          <span className="font-semibold tabular-nums">{mentionCount}</span>{" "}
          <span className="text-muted-foreground">total mentions</span>
        </span>
        <span>
          <span className="font-semibold tabular-nums">{sourceCount}</span>{" "}
          <span className="text-muted-foreground">unique sources</span>
        </span>
        {avgTone != null && (
          <span className={toneColor}>
            Tone: <span className="font-semibold">{avgTone.toFixed(1)}</span>
          </span>
        )}
      </div>
      {visibleSources.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Sources: </span>
          {visibleSources.map((s) => `${domainToFlag(s)} ${s}`).join(", ")}
          {remaining > 0 && (
            <span className="ml-1 text-muted-foreground">+{remaining} more</span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function EventDetailCoverageTab({ eventId }: { eventId: string }) {
  const { data, isLoading, isError, error } = trpc.intel.coverage.useQuery(
    { eventId },
    { staleTime: 5 * 60 * 1000 },
  );

  const clusters = useMemo(() => {
    if (!data?.headlines || data.headlines.length === 0) return [];
    return clusterHeadlines(data.headlines);
  }, [data?.headlines]);

  const uniqueSources = useMemo(() => {
    if (!data?.headlines) return [];
    return [...new Set(data.headlines.map((h) => h.source))];
  }, [data?.headlines]);

  if (isLoading) {
    return (
      <div className="space-y-3 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading coverage data…
        </div>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-12 rounded-lg border bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Failed to load coverage: {error?.message ?? "Unknown error"}
      </div>
    );
  }

  if (!data || data.mentionCount < 2) {
    return (
      <div className="py-4 text-sm text-muted-foreground">
        Not enough coverage data for this event (minimum 5 mentions required).
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <CoverageHeader
        mentionCount={data.mentionCount}
        sourceCount={data.sourceCount}
        avgTone={data.avgTone}
        sources={uniqueSources}
      />

      {clusters.length === 0 ? (
        /* Fallback: flat list when clustering produces no groups */
        <div className="rounded-lg border bg-background shadow-sm divide-y overflow-hidden">
          {data.headlines.map((h) => (
            <div key={h.id} className="px-4 py-3 flex items-start gap-3">
              <div className="flex-shrink-0 text-base leading-none mt-0.5">
                {domainToFlag(h.source)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-muted-foreground">{h.source}</div>
                <div className="mt-0.5 text-sm leading-snug">{h.title}</div>
              </div>
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {clusters.length} narrative cluster{clusters.length !== 1 ? "s" : ""} detected
            — sorted by mention count
          </p>
          <div className="space-y-2">
            {clusters.map((cluster) => (
              <ClusterItem key={cluster.id} cluster={cluster} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
