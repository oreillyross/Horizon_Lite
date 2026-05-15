import { callOpenAIJson } from "../llm/openai";

export type IndicatorHint = { id: string; name: string; description?: string | null };

export async function suggestIndicator(
  quote: string,
  indicators: IndicatorHint[],
): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  if (indicators.length === 0) return null;

  const system = [
    "You are an intelligence analyst assistant.",
    "Given a quoted text passage and a list of indicators, return ONLY a JSON object",
    'with shape { "indicatorId": "<id from the list>" } or { "indicatorId": null } if none are relevant.',
    "Choose the single most relevant indicator. Return null if none apply.",
    "Return STRICT JSON only. No markdown, no explanation.",
  ].join("\n");

  const user = JSON.stringify({
    quote,
    indicators: indicators.map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description ?? null,
    })),
  });

  try {
    const model = process.env.INDICATOR_SUGGEST_MODEL ?? process.env.THEME_SYNOPSIS_MODEL ?? "gpt-4.1-mini";
    const raw = await callOpenAIJson({ model, system, user });
    const parsed = JSON.parse(raw) as { indicatorId?: string | null };
    if (typeof parsed?.indicatorId === "string" && parsed.indicatorId.length > 0) {
      const valid = indicators.find((i) => i.id === parsed.indicatorId);
      return valid ? parsed.indicatorId : null;
    }
    return null;
  } catch {
    return null;
  }
}
