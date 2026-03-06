export function scoreArticle(text: string) {
  const lower = text.toLowerCase();

  let score = 0;

  if (lower.includes("cyber")) score += 2;
  if (lower.includes("sabotage")) score += 3;
  if (lower.includes("disinformation")) score += 2;
  if (lower.includes("undersea cable")) score += 3;
  if (lower.includes("propaganda")) score += 1;

  return score;
}

export function mapIndicator(text: string) {
  const lower = (text ?? "").toLowerCase();

  if (lower.includes("disinformation"))
    return "ind_cross_language_amplification";

  if (lower.includes("cyber"))
    return "ind_public_sector_cyber";

  if (lower.includes("cable"))
    return "ind_undersea_cable_mentions";

  return "ind_general_pressure";
}