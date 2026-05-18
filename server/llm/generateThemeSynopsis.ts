import { createHash } from "node:crypto";
import { ThemeSynopsisSchema, type ThemeSynopsis } from "@shared";
import { callOpenAIJson } from "./openai";

function clip(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export type ScenarioContext = {
  id: string;
  name: string;
  description: string;
  indicators: Array<{
    id: string;
    name: string;
    strength: number;
    decayBehaviour: string;
    status: string;
  }>;
  recentSnippets: Array<{
    id: string;
    quote: string | null;
    pubDate: string | null;
    analystNotes: string | null;
  }>;
};

export type PromptContext = {
  theme: { id: string; name: string; description: string | null };
  snippets: Array<{ id: string; createdAt: string; tags: string[]; content: string }>;
  scenarios: ScenarioContext[];
};

export function buildPromptPayload(ctx: PromptContext): object {
  const MAX_SNIPPETS = 100;
  const MAX_CHARS_PER_SNIPPET = 800;
  const MAX_RECENT_PER_SCENARIO = 5;

  const corpus = (ctx.snippets ?? [])
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_SNIPPETS)
    .map((s) => ({
      id: s.id,
      createdAt: s.createdAt,
      tags: s.tags ?? [],
      content: clip(s.content ?? "", MAX_CHARS_PER_SNIPPET),
    }));

  const scenarioSection = (ctx.scenarios ?? []).map((sc) => ({
    id: sc.id,
    name: sc.name,
    description: sc.description ?? "",
    indicators: (sc.indicators ?? []).map((ind) => ({
      name: ind.name,
      strength: ind.strength,
      decayBehaviour: ind.decayBehaviour,
      status: ind.status,
    })),
    recentSnippets: (sc.recentSnippets ?? [])
      .slice(0, MAX_RECENT_PER_SCENARIO)
      .map((sn) => ({
        id: sn.id,
        quote: sn.quote ?? null,
        pubDate: sn.pubDate ?? null,
        analystNotes: sn.analystNotes ?? null,
      })),
  }));

  return {
    theme: {
      id: ctx.theme.id,
      name: ctx.theme.name,
      description: ctx.theme.description ?? null,
    },
    instructions: {
      synopsis: "1–3 short paragraphs, high-signal, no fluff.",
      keyPoints: "Bullets; each must cite snippet ids.",
      openQuestions: "Bullets; cite snippet ids when relevant.",
      timeline: "Optional; include only if there are time-anchored events.",
      scenarioGuidance:
        "For each scenario, assess whether current indicator signals support or undermine it.",
    },
    snippets: corpus,
    ...(scenarioSection.length > 0 ? { scenarios: scenarioSection } : {}),
    outputShape: {
      synopsis: "string",
      keyPoints: [{ text: "string", citeSnippetIds: ["snippet-id"] }],
      openQuestions: [{ text: "string", citeSnippetIds: ["snippet-id"] }],
      timeline: [{ when: "string", what: "string", citeSnippetIds: ["snippet-id"] }],
    },
  };
}

export function computeContextHash(ctx: PromptContext): string {
  const stable = {
    themeId: ctx.theme.id,
    themeName: ctx.theme.name,
    themeDescription: ctx.theme.description ?? null,
    scenarios: (ctx.scenarios ?? [])
      .map((sc) => ({
        id: sc.id,
        name: sc.name,
        indicators: (sc.indicators ?? [])
          .map((i) => ({
            id: i.id,
            strength: i.strength,
            decay: i.decayBehaviour,
            status: i.status,
          }))
          .sort((a, b) => a.id.localeCompare(b.id)),
        recentSnippets: (sc.recentSnippets ?? [])
          .map((s) => ({ id: s.id, pubDate: s.pubDate ?? null }))
          .sort((a, b) => a.id.localeCompare(b.id)),
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
  return createHash("sha256").update(JSON.stringify(stable)).digest("hex");
}

export async function generateThemeSynopsis(opts: {
  theme: { id: string; name: string; description: string | null };
  snippets: Array<{
    id: string;
    createdAt: Date;
    tags: string[];
    content: string;
  }>;
  scenarios?: ScenarioContext[];
  model?: string;
}): Promise<{ parsed: ThemeSynopsis; rawJson: string; model: string; contextHash: string }> {
  const model = opts.model ?? process.env.THEME_SYNOPSIS_MODEL ?? "gpt-4.1-mini";

  const ctx: PromptContext = {
    theme: opts.theme,
    snippets: opts.snippets.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      tags: s.tags ?? [],
      content: s.content ?? "",
    })),
    scenarios: opts.scenarios ?? [],
  };

  const contextHash = computeContextHash(ctx);
  const payload = buildPromptPayload(ctx);

  const system = [
    "You are an analyst writing a living dossier for a Theme.",
    "You MUST only use the provided snippets as evidence.",
    "Return STRICT JSON (no markdown, no commentary).",
    "Cite supporting snippet ids for each key point and question via citeSnippetIds.",
    "If evidence is weak or conflicting, say so in the synopsis and reflect it in openQuestions.",
  ].join("\n");

  const rawJson = await callOpenAIJson({ model, system, user: JSON.stringify(payload, null, 2) });

  const parsed = ThemeSynopsisSchema.parse(JSON.parse(rawJson));
  return { parsed, rawJson: JSON.stringify(parsed), model, contextHash };
}
