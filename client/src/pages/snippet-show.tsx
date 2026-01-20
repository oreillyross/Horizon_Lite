import React from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";

type Snippet = {
  id: string;
  createdAt: string;
  content: string;
  tags: string[];
};

interface Props {
  data: Snippet[];
}

export function SnippetTable({ data }: Props) {
  
  
  
  const columns = React.useMemo<ColumnDef<Snippet>[]>(
    () => [
      {
        header: "Created At",
        accessorKey: "createdAt",
        cell: info => new Date(info.getValue() as string).toLocaleString(),
      },
      {
        header: "Content",
        accessorKey: "content",
      },
      {
        header: "Tags",
        accessorKey: "tags",
        cell: info => (info.getValue() as string[]).join(", "),
      },
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="p-4">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="p-2 text-left border-b">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id}>
              {row.getVisibleCells().map(cell => (
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
