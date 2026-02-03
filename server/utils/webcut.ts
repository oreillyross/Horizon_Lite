// server/lib/webcut.ts
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import sanitizeHtml from "sanitize-html";

type FetchReadableResult = {
  url: string;
  host: string;
  title: string;
  contentHtml: string; // sanitized
  textContent: string; // plain text fallback / future use
};

const MAX_HTML_BYTES = 2_000_000; // 2MB safety cap
const TIMEOUT_MS = 10_000;

function safeUrl(input: string) {
  const u = new URL(input);
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http/https URLs are allowed.");
  }
  return u;
}

function sanitizeReadableHtml(html: string) {
  // Keep it readable; strip scripts/iframes/styles etc.
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img", // optional; ok to allow, but you can remove if you truly want text-only
      "h1",
      "h2",
      "h3",
      "figure",
      "figcaption",
      "pre",
      "code",
    ]),
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title"],
      "*": ["class"],
    },
    // Avoid javascript: hrefs etc.
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
    },
  });
}

export async function fetchReadable(urlInput: string): Promise<FetchReadableResult> {
  const url = safeUrl(urlInput);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        // Some sites return better HTML with a real UA
        "user-agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        accept: "text/html,application/xhtml+xml",
      },
    });

    if (!res.ok) {
      throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
      // MVP: only HTML
      throw new Error(`Unsupported content-type: ${contentType || "unknown"}`);
    }

    // Enforce size cap
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_HTML_BYTES) {
      throw new Error("Page too large to load.");
    }
    html = new TextDecoder("utf-8").decode(buf);
  } finally {
    clearTimeout(timeout);
  }

  const dom = new JSDOM(html, { url: url.toString() });
  const doc = dom.window.document;

  // Readability needs a full Document
  const reader = new Readability(doc);
  const article = reader.parse();

  if (!article) {
    throw new Error("Could not extract readable content from this page.");
  }

  const title = (article.title || doc.title || url.hostname).trim();
  const contentHtml = sanitizeReadableHtml(article.content || "");
  const textContent = (article.textContent || "").trim();

  if (!contentHtml && !textContent) {
    throw new Error("Extracted page content is empty.");
  }

  return {
    url: url.toString(),
    host: url.host,
    title,
    contentHtml,
    textContent,
  };
}
