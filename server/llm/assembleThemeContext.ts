import { eq, desc, inArray, and, isNotNull } from "drizzle-orm";
import { db } from "../db";
import { themes, scenarios, scenarioIndicatorMap, indicators, snippets } from "@shared/db";
import type { PromptContext, ScenarioContext } from "./generateThemeSynopsis";

export async function assembleThemeContext(themeId: string): Promise<PromptContext> {
  const [theme] = await db
    .select({ id: themes.id, name: themes.name, description: themes.description })
    .from(themes)
    .where(eq(themes.id, themeId))
    .limit(1);

  if (!theme) throw new Error(`Theme not found: ${themeId}`);

  const scenarioRows = await db
    .select({ id: scenarios.id, name: scenarios.name, description: scenarios.description })
    .from(scenarios)
    .where(eq(scenarios.themeId, themeId));

  const scenarioIds = scenarioRows.map((s) => s.id);

  const indicatorLinks =
    scenarioIds.length > 0
      ? await db
          .select({
            scenarioId: scenarioIndicatorMap.scenarioId,
            id: indicators.id,
            name: indicators.name,
            strength: indicators.strength,
            decayBehaviour: indicators.decayBehaviour,
            status: indicators.status,
          })
          .from(scenarioIndicatorMap)
          .innerJoin(indicators, eq(indicators.id, scenarioIndicatorMap.indicatorId))
          .where(inArray(scenarioIndicatorMap.scenarioId, scenarioIds))
      : [];

  const indicatorIds = [...new Set(indicatorLinks.map((l) => l.id))];

  const snippetRows =
    indicatorIds.length > 0
      ? await db
          .select({
            id: snippets.id,
            quote: snippets.quote,
            pubDate: snippets.pubDate,
            analystNotes: snippets.analystNotes,
            indicatorId: snippets.indicatorId,
            createdAt: snippets.createdAt,
          })
          .from(snippets)
          .where(and(inArray(snippets.indicatorId, indicatorIds), isNotNull(snippets.indicatorId)))
          .orderBy(desc(snippets.pubDate))
      : [];

  // Group: indicatorId → top-5 snippets
  const snippetsByIndicator = new Map<string, typeof snippetRows>();
  for (const sn of snippetRows) {
    if (!sn.indicatorId) continue;
    const bucket = snippetsByIndicator.get(sn.indicatorId) ?? [];
    if (bucket.length < 5) bucket.push(sn);
    snippetsByIndicator.set(sn.indicatorId, bucket);
  }

  // Group indicators by scenarioId
  const indicatorsByScenario = new Map<string, typeof indicatorLinks>();
  for (const link of indicatorLinks) {
    const bucket = indicatorsByScenario.get(link.scenarioId) ?? [];
    bucket.push(link);
    indicatorsByScenario.set(link.scenarioId, bucket);
  }

  const scenarioContexts: ScenarioContext[] = scenarioRows.map((sc) => {
    const scIndicators = indicatorsByScenario.get(sc.id) ?? [];
    const allSnippets = scIndicators
      .flatMap((ind) =>
        (snippetsByIndicator.get(ind.id) ?? []).map((sn) => ({
          id: sn.id,
          quote: sn.quote,
          pubDate: sn.pubDate ? sn.pubDate.toISOString() : null,
          analystNotes: sn.analystNotes,
        })),
      )
      .slice(0, 5);

    return {
      id: sc.id,
      name: sc.name,
      description: sc.description,
      indicators: scIndicators.map((ind) => ({
        id: ind.id,
        name: ind.name,
        strength: ind.strength,
        decayBehaviour: ind.decayBehaviour,
        status: ind.status ?? "normal",
      })),
      recentSnippets: allSnippets,
    };
  });

  // Legacy snippets directly linked to theme via themeId
  const legacySnippets = await db
    .select({
      id: snippets.id,
      content: snippets.content,
      tags: snippets.tags,
      createdAt: snippets.createdAt,
    })
    .from(snippets)
    .where(eq(snippets.themeId, themeId))
    .orderBy(desc(snippets.createdAt))
    .limit(300);

  return {
    theme,
    snippets: legacySnippets.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      tags: s.tags ?? [],
      content: s.content,
    })),
    scenarios: scenarioContexts,
  };
}
