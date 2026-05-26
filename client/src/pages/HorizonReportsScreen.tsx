import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { TrendingUp, TrendingDown, Minus, ExternalLink, FileText, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type AssessmentScenario = {
  scenarioId: string;
  scenarioName: string;
  scenarioDescription: string;
  delta: number;
  indicators: {
    indicatorId: string;
    indicatorName: string;
    strength: number;
    timeWeight: string;
    events: {
      eventId: string;
      title: string | null;
      sourceUrl: string | null;
      score: number;
      createdAt: Date;
    }[];
  }[];
};

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className ?? ""}`} />;
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
        <TrendingUp className="h-3.5 w-3.5" />
        {delta.toFixed(1)}
      </span>
    );
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-rose-500">
        <TrendingDown className="h-3.5 w-3.5" />
        {Math.abs(delta).toFixed(1)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

function EvidenceRows({ scenario }: { scenario: AssessmentScenario }) {
  const hasEvidence = scenario.indicators.some((ind) => ind.events.length > 0);

  if (!hasEvidence) {
    return (
      <p className="mt-3 text-xs text-muted-foreground italic">
        No approved signal events in this window.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      {scenario.indicators
        .filter((ind) => ind.events.length > 0)
        .map((ind) => (
          <div key={ind.indicatorId} className="rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="tabular-nums text-xs">
                {ind.strength}
              </Badge>
              <span className="text-xs font-medium">{ind.indicatorName}</span>
              <span className="ml-auto text-xs text-muted-foreground capitalize">
                {ind.timeWeight}
              </span>
            </div>
            <ul className="mt-1.5 space-y-1 pl-2">
              {ind.events.map((ev) => (
                <li key={ev.eventId} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="mt-0.5 shrink-0 text-muted-foreground/50">•</span>
                  <span className="flex-1">
                    {ev.title ?? "(untitled event)"}
                    {ev.sourceUrl && (
                      <a
                        href={ev.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1.5 inline-flex items-center gap-0.5 text-xs text-blue-500 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        source
                      </a>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}

function ScenarioCard({ scenario }: { scenario: AssessmentScenario }) {
  const [showEvidence, setShowEvidence] = React.useState(false);
  const hasEvidence = scenario.indicators.some((ind) => ind.events.length > 0);

  return (
    <div className="rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium">{scenario.scenarioName}</div>
          {scenario.scenarioDescription && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
              {scenario.scenarioDescription}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 pt-0.5">
          {hasEvidence && (
            <button
              onClick={() => setShowEvidence((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showEvidence ? "rotate-180" : ""}`}
              />
              {showEvidence ? "Hide evidence" : "Show evidence"}
            </button>
          )}
          <DeltaBadge delta={scenario.delta} />
        </div>
      </div>
      {showEvidence && <EvidenceRows scenario={scenario} />}
    </div>
  );
}

function SectionBlock({
  title,
  accent,
  scenarios,
}: {
  title: string;
  accent: "green" | "red" | "muted";
  scenarios: AssessmentScenario[];
}) {
  if (scenarios.length === 0) return null;

  const headingClass =
    accent === "green"
      ? "text-emerald-700 dark:text-emerald-400"
      : accent === "red"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";

  return (
    <section>
      <h2 className={`mb-3 text-sm font-semibold uppercase tracking-wide ${headingClass}`}>
        {title}
      </h2>
      <div className="space-y-3">
        {scenarios.map((s) => (
          <ScenarioCard key={s.scenarioId} scenario={s} />
        ))}
      </div>
    </section>
  );
}

function AssessmentSkeletons() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="mt-6 h-4 w-28" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

const WINDOWS = [
  { label: "7d", value: "7d" as const },
  { label: "30d", value: "30d" as const },
  { label: "90d", value: "90d" as const },
];

export default function HorizonReportsScreen() {
  const [themeId, setThemeId] = useState<string | undefined>(undefined);
  const [window, setWindow] = useState<"7d" | "30d" | "90d">("30d");

  const themesQuery = trpc.horizon.themes.list.useQuery();
  const assessmentQuery = trpc.horizon.reports.generateAssessment.useQuery(
    { themeId: themeId!, window },
    { enabled: !!themeId }
  );

  const scenarios = assessmentQuery.data ?? [];
  const warmer = scenarios.filter((s) => s.delta > 0);
  const neutral = scenarios.filter((s) => s.delta === 0);
  const colder = scenarios.filter((s) => s.delta < 0);

  return (
    <div className="mx-auto max-w-4xl px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            <Link href="/horizon/overview" className="hover:underline">
              Horizon
            </Link>
            <span className="mx-2">/</span>
            <span>Reports</span>
          </div>
          <div className="mt-2 text-3xl font-semibold">Sentinel Assessment</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Signal activity across scenarios for the selected theme.
          </div>
        </div>
      </div>

      {/* Controls row */}
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Theme</span>
          <Select
            value={themeId ?? ""}
            onValueChange={(val) => setThemeId(val || undefined)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a theme…" />
            </SelectTrigger>
            <SelectContent>
              {(themesQuery.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 rounded-md border p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.value}
              onClick={() => setWindow(w.value)}
              className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                window === w.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="mt-8">
        {!themeId ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background py-16 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <div className="text-base font-medium">No theme selected</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a theme above to generate a Sentinel Assessment.
            </p>
          </div>
        ) : assessmentQuery.isLoading ? (
          <AssessmentSkeletons />
        ) : assessmentQuery.isError ? (
          <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
            {assessmentQuery.error.message}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-background py-16 text-center">
            <FileText className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <div className="text-base font-medium">No scenarios in this theme</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Add scenarios to this theme to see an assessment.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <SectionBlock title="Warmer scenarios" accent="green" scenarios={warmer} />
            <SectionBlock title="No movement" accent="muted" scenarios={neutral} />
            <SectionBlock title="Colder scenarios" accent="red" scenarios={colder} />
          </div>
        )}
      </div>
    </div>
  );
}
