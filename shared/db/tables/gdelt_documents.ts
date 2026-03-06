import {
  pgTable,
  text,
  timestamp,
  doublePrecision,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const gdeltDocuments = pgTable(
  "gdelt_documents",
  {
    url: text("url").primaryKey(),
    domain: text("domain"),

    // GKG has precise pub timestamp in the <PAGE_PRECISEPUBTIMESTAMP> block when present.
    publishedAt: timestamp("published_at", { withTimezone: true }),

    title: text("title"),
    imageUrl: text("image_url"),

    tone: doublePrecision("tone"),

    // Store as text[] for MVP: fast + queryable
    themes: text("themes").array().notNull().default([]),
    organizations: text("organizations").array().notNull().default([]),

    // optional: raw payload for later reparsing
    rawExtrasXml: text("raw_extras_xml"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    publishedIdx: index("gdelt_documents_published_idx").on(t.publishedAt),
    domainIdx: index("gdelt_documents_domain_idx").on(t.domain),
  }),
);

export type GdeltDocumentRow = typeof gdeltDocuments.$inferSelect;