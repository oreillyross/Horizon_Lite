import { ThemeSynopsisSchema, type ThemeSynopsis } from "@shared";
import { callOpenAIJson } from "./openai";

function clip(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

export async function generateThemeSynopsis(opts: {
  theme: { id: string; name: string; description: string | null };
  snippets: Array<{
    id: string;
    createdAt: Date;
    tags: string[];
    content: string;
  }>;
  model?: string;
}): Promise<{ parsed: ThemeSynopsis; rawJson: string; model: string }> {
  const model = opts.model ?? process.env.THEME_SYNOPSIS_MODEL ?? "gpt-4.1-mini";

  // Deterministic input: newest first, cap.
  const MAX_SNIPPETS = 100;
  const MAX_CHARS_PER_SNIPPET = 800;

  const corpus = opts.snippets
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, MAX_SNIPPETS)
    .map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      tags: s.tags ?? [],
      content: clip(s.content ?? "", MAX_CHARS_PER_SNIPPET),
    }));

  const system = [
    "You are an analyst writing a living dossier for a Theme.",
    "You MUST only use the provided snippets as evidence.",
    "Return STRICT JSON (no markdown, no commentary).",
    "Cite supporting snippet ids for each key point and question via citeSnippetIds.",
    "If evidence is weak or conflicting, say so in the synopsis and reflect it in openQuestions.",
  ].join("\n");

  const user = JSON.stringify(
    {
      theme: {
        id: opts.theme.id,
        name: opts.theme.name,
        description: opts.theme.description,
      },
      instructions: {
        synopsis: "1–3 short paragraphs, high-signal, no fluff.",
        keyPoints: "Bullets; each must cite snippet ids.",
        openQuestions: "Bullets; cite snippet ids when relevant.",
        timeline: "Optional; include only if there are time-anchored events.",
      },
      snippets: corpus,
      outputShape: {
        synopsis: "string",
        keyPoints: [{ text: "string", citeSnippetIds: ["snippet-id"] }],
        openQuestions: [{ text: "string", citeSnippetIds: ["snippet-id"] }],
        timeline: [{ when: "string", what: "string", citeSnippetIds: ["snippet-id"] }],
      },
    },
    null,
    2,
  );

  const rawJson = await callOpenAIJson({ model, system, user });

  // Validate & normalize.
  const parsed = ThemeSynopsisSchema.parse(JSON.parse(rawJson));
  return { parsed, rawJson: JSON.stringify(parsed), model };
}
