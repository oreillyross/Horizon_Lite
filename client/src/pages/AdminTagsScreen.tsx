import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Pencil, Trash2, Plus } from "lucide-react";

type TagForm = {
  id?: string;
  name: string;
  description: string;
};

export default function AdminTagsScreen() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<TagForm>({ name: "", description: "" });

  const utils = trpc.useUtils();
  const listQuery = trpc.tags.list.useQuery({ q });

  const createMut = trpc.tags.create.useMutation({
    onSuccess: async () => {
      await utils.tags.list.invalidate();
      setOpen(false);
      setForm({ name: "", description: "" });
    },
  });

  const updateMut = trpc.tags.update.useMutation({
    onSuccess: async () => {
      await utils.tags.list.invalidate();
      setOpen(false);
      setForm({ name: "", description: "" });
    },
  });

  const deleteMut = trpc.tags.delete.useMutation({
    onSuccess: async () => {
      await utils.tags.list.invalidate();
    },
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  const rows = listQuery.data ?? [];

  function onCreateClick() {
    setForm({ name: "", description: "" });
    setOpen(true);
  }

  function onEditClick(row: any) {
    setForm({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
    });
    setOpen(true);
  }

  async function onDeleteClick(row: any) {
    // keep it simple: confirm()
    if (!confirm(`Delete tag "${row.name}"? This will remove links from snippets/sources.`)) return;
    await deleteMut.mutateAsync({ id: row.id });
  }

  async function onSave() {
    const name = form.name.trim();
    const description = form.description.trim();

    if (!name) return;

    if (form.id) {
      await updateMut.mutateAsync({
        id: form.id,
        name,
        description: description ? description : null,
      });
    } else {
      await createMut.mutateAsync({
        name,
        description: description ? description : null,
      });
    }
  }

  return (
    <div className="p-4 space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Tags</h1>
          <p className="text-sm text-muted-foreground">
            Manage canonical tags used across snippets and sources.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tags…"
            className="w-56"
          />
          <Button onClick={onCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Create
          </Button>
        </div>
      </header>

      <section className="rounded-lg border bg-background">
        <div className="border-b px-4 py-2 text-sm text-muted-foreground flex items-center justify-between">
          <div>
            {listQuery.isLoading ? "Loading…" : `${rows.length} tag${rows.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {listQuery.isLoading ? (
          <div className="p-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tags…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-muted-foreground">No tags yet.</div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.name}</div>
                  {r.description ? (
                    <div className="text-sm text-muted-foreground line-clamp-2">{r.description}</div>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    Snippets: <span className="tabular-nums">{r.snippetCount}</span>{" "}
                    · Sources: <span className="tabular-nums">{r.sourceItemCount}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEditClick(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDeleteClick(r)} disabled={deleteMut.isPending}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit tag" : "Create tag"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. geopolitics"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Optional…"
                className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={onSave} disabled={isSaving || !form.name.trim()}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
