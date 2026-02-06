import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { Link, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import {PillTabs, type TabValue} from "@/components/PillTabs"
import {type Snippet} from "@shared"


export default function SnippetTable() {
  const snippetsQuery = trpc.getSnippets.useQuery();
  const [activeTab, setActiveTab] = useState<TabValue>("all")
  const showRecent = activeTab === "recent"
  
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
        (tag) => (tag ?? "").trim().toLowerCase().replace(/\s+/g, "-") === activeTag.toLowerCase(),
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


  const utils = trpc.useUtils();

  const deleteSnippetMutation = trpc.deleteSnippet.useMutation({
    onSuccess: (_, { id }) => {
      utils.getSnippets.setData(undefined, (old) =>
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

  const table = useReactTable({
    data: finalData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

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

  
  
  return (
    <div className="p-4">
      {activeTag && (
        <div className="mb-3 flex items-center gap-2 text-sm">
          <span className="rounded border px-2 py-1 font-mono">#{activeTag}</span>
          <Link href="/snippet/show" className="text-muted-foreground hover:underline">
            clear
          </Link>
        </div>
      )}
<div className="flex "><PillTabs value={activeTab} onValueChange={setActiveTab} className="justify-end"/></div>
      <table className="min-w-full border border-gray-300 dark:border-gray-700">
        <thead className="bg-gray-100">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="p-2 text-left border-b">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="p-2 border-b">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
