import React, { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { PillTabs, type TabValue } from "@/components/PillTabs";
import { type Snippet } from "@shared";

export default function SnippetTable() {
  const snippetsQuery = trpc.snippets.getSnippets.useQuery();
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const showRecent = activeTab === "recent";

  const [openThemes, setOpenThemes] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("snippetTable:openThemes");
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const onAccordionChange = (next: string[]) => {
    setOpenThemes(next);
    try {
      localStorage.setItem("snippetTable:openThemes", JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const search = useSearch();

  const activeTag = useMemo(() => {
    const params = new URLSearchParams(search);
    return params.get("tag");
  }, [search]);

  const rawData = snippetsQuery.data ?? [];

  const data = useMemo(() => {
    if (!activeTag) return rawData;
    return rawData.filter((s) =>
      (s.tags ?? []).some(
        (tag) =>
          (tag ?? "").trim().toLowerCase().replace(/\s+/g, "-") ===
          activeTag.toLowerCase(),
      ),
    );
  }, [activeTag, rawData]);

  const finalData = useMemo(() => {
    // Start from tag-filtered data
    let out = data;

    if (showRecent) {
      const RECENT_HOURS = 24;
      const cutoff = Date.now() - RECENT_HOURS * 60 * 60 * 1000;

      out = out.filter((s) => {
        const t =
          s.createdAt instanceof Date
            ? s.createdAt.getTime()
            : new Date(s.createdAt as any).getTime();
        return t >= cutoff;
      });
    }

    return out;
  }, [data, showRecent]);

  const themesQuery = trpc.themes.getThemes.useQuery();

  const themeNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of themesQuery.data ?? []) map.set(t.id, t.name);
    return map;
  }, [themesQuery.data]);

  const grouped = useMemo(() => {
    // preserve a stable order: theme name asc, with "Unassigned" last (or first — your call)
    const buckets = new Map<
      string,
      { themeId: string | null; themeName: string; snippets: Snippet[] }
    >();

    for (const s of finalData) {
      const id = s.themeId ?? null;
      const key = id ?? "__unassigned__";
      const themeName = id
        ? (themeNameById.get(id) ?? "Unknown theme")
        : "Unassigned";

      const existing = buckets.get(key);
      if (existing) existing.snippets.push(s);
      else buckets.set(key, { themeId: id, themeName, snippets: [s] });
    }

    const arr = Array.from(buckets.values());

    arr.sort((a, b) => {
      if (a.themeId === null && b.themeId !== null) return 1; // unassigned last
      if (a.themeId !== null && b.themeId === null) return -1;
      return a.themeName.localeCompare(b.themeName);
    });

    // optional: sort snippets within each theme by createdAt desc
    for (const g of arr) {
      g.snippets.sort((a, b) => {
        const ta =
          a.createdAt instanceof Date
            ? a.createdAt.getTime()
            : new Date(a.createdAt as any).getTime();
        const tb =
          b.createdAt instanceof Date
            ? b.createdAt.getTime()
            : new Date(b.createdAt as any).getTime();
        return tb - ta;
      });
    }

    return arr;
  }, [finalData, themeNameById]);

  const utils = trpc.useUtils();

  const deleteSnippetMutation = trpc.snippets.deleteSnippet.useMutation({
    onSuccess: (_, { id }) => {
      utils.snippets.getSnippets.setData(undefined, (old) =>
        old?.filter((s) => s.id !== id),
      );
    },
  });

  const columns = React.useMemo<ColumnDef<Snippet>[]>(
    () => [
      {
        header: "Created At",
        accessorKey: "createdAt",
        cell: (info) => (info.getValue() as Date).toLocaleString(),
      },
      {
        header: "Content",
        accessorKey: "content",
        cell: ({ row }) => {
          const snippet = row.original;
          return (
            <Link
              href={`/snippet/${snippet.id}/edit`}
              className="font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring line-clamp-1"
            >
              {snippet.content}
            </Link>
          );
        },
      },
      {
        header: "Tags",
        accessorKey: "tags",
        cell: (info) => (info.getValue() as string[]).join(", "),
      },
      {
        header: "Actions",
        id: "actions",
        cell: ({ row }) => {
          const snippet = row.original;
          return (
            <button
              className="text-red-500 hover:text-red-700 disabled:opacity-50"
              onClick={() => {
                if (
                  confirm(`Delete "${snippet.content.substring(0, 30)}..."?`)
                ) {
                  deleteSnippetMutation.mutate({ id: snippet.id });
                }
              }}
              disabled={deleteSnippetMutation.isPending}
              aria-label="Delete snippet"
            >
              🗑️
            </button>
          );
        },
      },
    ],
    [deleteSnippetMutation],
  );

  if (snippetsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2
          role="status"
          aria-label="Loading Snippets"
          className="h-6 w-6 animate-spin text-muted-foreground"
        />
      </div>
    );
  }

  // ---- Empty state (no snippets, or nothing matching filters) ----
  if (finalData.length === 0) {
    const isFiltered = Boolean(activeTag) || showRecent;
    const title = isFiltered ? "No snippets found" : "You have no snippets";
    const subtitle = isFiltered
      ? "Try clearing your filters, or capture a new snippet."
      : "Capture something interesting to start building your knowledge base.";

    return (
      <div className="p-4">
        <div className="rounded-lg border bg-background p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-medium">{title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

              {activeTag && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="rounded border px-2 py-1 font-mono">
                    #{activeTag}
                  </span>
                  <Link
                    href="/snippet/show"
                    className="text-muted-foreground hover:underline"
                  >
                    clear
                  </Link>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {isFiltered && (
                <Link
                  href="/snippet/show"
                  className="inline-flex min-h-9 items-center justify-center whitespace-nowrap rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
                >
                  Clear filters
                </Link>
              )}

              <Link
                href="/snippet/create"
                className="inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Create snippet
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {activeTag && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="rounded border px-2 py-1 font-mono">
            #{activeTag}
          </span>
          <Link
            href="/snippet/show"
            className="text-muted-foreground hover:underline"
          >
            clear
          </Link>
        </div>
      )}
      <div className="flex ">
        <PillTabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="justify-end"
        />
      </div>
      <Accordion
        type="multiple"
        value={openThemes}
        onValueChange={onAccordionChange}
        className="space-y-3"
      >
        {grouped.map((g) => {
          const value = g.themeId ?? "unassigned";

          return (
            <AccordionItem
              key={value}
              value={value}
              className="rounded-lg border bg-background shadow-sm"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-base font-semibold">
                        {g.themeName}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {g.snippets.length}
                      </span>
                    </div>

                    {g.themeId ? (
                      <span className="text-xs text-muted-foreground">
                        Theme ID: <span className="font-mono">{g.themeId}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No theme assigned
                      </span>
                    )}
                  </div>

                  {/* optional quick actions on the right */}
                  <div
                    className="flex items-center gap-3"
                    onClick={(e) => e.stopPropagation()} // prevent toggling when clicking links
                  >
                    {g.themeId && (
                      <>
                        <Link
                          href={`/theme/${g.themeId}`}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          view
                        </Link>
                        <Link
                          href={`/snippet/create?themeId=${g.themeId}`}
                          className="text-sm text-muted-foreground hover:underline"
                        >
                          add
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                          Created
                        </th>
                        <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                          Content
                        </th>
                        <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                          Tags
                        </th>
                        <th className="p-2 text-left text-sm font-medium text-muted-foreground">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {g.snippets.map((snippet) => (
                        <tr key={snippet.id} className="border-t">
                          <td className="p-2 text-sm text-muted-foreground whitespace-nowrap">
                            {(snippet.createdAt instanceof Date
                              ? snippet.createdAt
                              : new Date(snippet.createdAt as any)
                            ).toLocaleString()}
                          </td>

                          <td className="p-2">
                            <Link
                              href={`/snippet/${snippet.id}/edit`}
                              className="font-medium hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring line-clamp-1"
                            >
                              {snippet.content}
                            </Link>
                          </td>

                          <td className="p-2 text-sm text-muted-foreground">
                            {(snippet.tags ?? []).join(", ")}
                          </td>

                          <td className="p-2">
                            <button
                              className="text-red-500 hover:text-red-700 disabled:opacity-50"
                              onClick={() => {
                                if (
                                  confirm(
                                    `Delete "${snippet.content.substring(0, 30)}..."?`,
                                  )
                                ) {
                                  deleteSnippetMutation.mutate({
                                    id: snippet.id,
                                  });
                                }
                              }}
                              disabled={deleteSnippetMutation.isPending}
                              aria-label="Delete snippet"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
