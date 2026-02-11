type OpenAIJsonResponse = {
  output_text?: string; // some SDKs
  // We'll treat the whole body as unknown and parse robustly.
};

export async function callOpenAIJson({
  model,
  system,
  user,
}: {
  model: string;
  system: string;
  user: string;
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  // Using the Responses API shape (works via plain fetch).
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      // Strongly nudge: JSON only.
      text: { format: { type: "json_object" } },
    }),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`OpenAI error ${res.status}: ${msg}`);
  }

  const data = (await res.json()) as any;

  // Robust extraction: try common shapes, fall back to stringify.
  const text =
    data?.output?.[0]?.content?.find?.((c: any) => c?.type === "output_text")?.text ??
    data?.output_text ??
    data?.response?.output_text ??
    null;

  if (typeof text === "string" && text.trim()) return text.trim();

  // Worst case: attempt to JSON-stringify and let downstream parse complain.
  return JSON.stringify(data);
}
