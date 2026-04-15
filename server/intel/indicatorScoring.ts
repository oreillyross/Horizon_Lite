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