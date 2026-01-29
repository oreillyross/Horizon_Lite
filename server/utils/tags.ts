
export function normalizeTag(input: string): string {
  // canonical:
  // - lowercase
  // - trim
  // - strip leading '#'
  // - collapse internal whitespace -> '-' (per spec "optional"; we choose YES for v1)
  const raw = (input ?? "").trim().toLowerCase();
  const noHash = raw.startsWith("#") ? raw.slice(1) : raw;

  // turn runs of whitespace into a single hyphen
  const dashed = noHash.replace(/\s+/g, "-");

  // (optional hardening) remove commas because UI may accept comma-separated lists later
  // Keep it conservative for now: just trim trailing/leading hyphens
  return dashed.replace(/^-+|-+$/g, "");
}

export function normalizeTags(inputs: string[]): string[] {
  // set semantics (unique per snippet)
  const set = new Set(
    (inputs ?? [])
      .map(normalizeTag)
      .filter((t) => t.length > 0)
  );
  return [...set];
}
