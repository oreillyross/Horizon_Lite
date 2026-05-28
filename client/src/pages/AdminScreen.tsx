import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

type Tab = "users" | "groups" | "links";

export default function AdminScreen() {
  const [tab, setTab] = useState<Tab>("users");
  
  const runGdeltJob = trpc.admin.runGdelt.useMutation();
  
 
  
  return (
    <main className="mx-auto w-full max-w-7xl px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, analyst groups, and access mappings.
          </p>
        </div>

        <nav className="flex gap-2">
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>Users</TabButton>
          <TabButton active={tab === "groups"} onClick={() => setTab("groups")}>Groups</TabButton>
          <TabButton active={tab === "links"} onClick={() => setTab("links")}>Links</TabButton>
        </nav>
      </header>

      {tab === "users" && <UsersPanel />}
      {tab === "groups" && <GroupsPanel />}
      {tab === "links" && <LinksPanel />}
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Admin Jobs</h1>

        <section className="rounded-lg border bg-background p-4 shadow-sm space-y-4">
          <h2 className="text-xl font-medium">Ingest feeds</h2>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <p className="font-medium text-sm">GDELT feed</p>
              <p className="text-xs text-muted-foreground">Media volume, tone, and event amplification signals</p>
            </div>
            <button
              onClick={() => runGdeltJob.mutate()}
              className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
              disabled={runGdeltJob.isPending}
            >
              {runGdeltJob.isPending ? "Running…" : "Run ingest"}
            </button>
          </div>

          <AcledFeedPanel />
        </section>
      </div>
    </main>
  );
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md border px-4 py-2 text-sm font-medium",
        active ? "bg-primary text-primary-foreground border-primary-border" : "bg-background hover:bg-accent",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function UsersPanel() {
  const utils = trpc.useUtils();
  const usersQ = trpc.admin.listUsers.useQuery();
  const groupsQ = trpc.admin.listGroups.useQuery();

  const setUserGroup = trpc.admin.setUserGroup.useMutation({
    onSuccess: async () => {
      await utils.admin.listUsers.invalidate();
    },
  });

  if (usersQ.isLoading || groupsQ.isLoading) {
    return <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (usersQ.isError) return <div className="text-sm text-destructive">{usersQ.error.message}</div>;
  if (groupsQ.isError) return <div className="text-sm text-destructive">{groupsQ.error.message}</div>;

  const groups = groupsQ.data ?? [];
  const users = usersQ.data ?? [];

  return (
    <section className="rounded-lg border bg-background p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Users</h2>
      </div>

      {users.length === 0 ? (
        <EmptyState title="No users yet" />
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Email</th>
                <th className="py-2 text-left font-medium">Created</th>
                <th className="py-2 text-left font-medium">Analyst group</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b last:border-b-0">
                  <td className="py-3">{u.email ?? u.id}</td>
                  <td className="py-3 tabular-nums">{new Date(u.createdAt).toLocaleString()}</td>
                  <td className="py-3">
                    <select
                      className="h-10 rounded-md border bg-background px-3"
                      value={u.analystGroupId ?? ""}
                      onChange={(e) =>
                        setUserGroup.mutate({ userId: u.id, groupId: e.target.value ? e.target.value : null })
                      }
                      disabled={setUserGroup.isPending}
                    >
                      <option value="">— None —</option>
                      {groups.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function GroupsPanel() {
  const utils = trpc.useUtils();
  const groupsQ = trpc.admin.listGroups.useQuery();
  const createGroup = trpc.admin.createGroup.useMutation({
    onSuccess: async () => {
      await utils.admin.listGroups.invalidate();
    },
  });
  const renameGroup = trpc.admin.renameGroup.useMutation({
    onSuccess: async () => {
      await utils.admin.listGroups.invalidate();
    },
  });
  const deleteGroup = trpc.admin.deleteGroup.useMutation({
    onSuccess: async () => {
      await utils.admin.listGroups.invalidate();
      await utils.admin.listUsers.invalidate();
      await utils.admin.listThemeLinks.invalidate();
    },
  });

  const [name, setName] = useState("");

  if (groupsQ.isLoading) {
    return <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (groupsQ.isError) return <div className="text-sm text-destructive">{groupsQ.error.message}</div>;

  const groups = groupsQ.data ?? [];

  return (
    <section className="rounded-lg border bg-background p-4 shadow-sm space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-medium">Analyst groups</h2>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New group name…" className="h-10 w-64" />
          <Button
            onClick={() => createGroup.mutate({ name: name.trim() })}
            disabled={!name.trim() || createGroup.isPending}
          >
            Create
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState title="No groups yet" />
      ) : (
        <div className="space-y-2">
          {groups.map((g: any) => (
            <GroupRow
              key={g.id}
              group={g}
              onRename={(newName) => renameGroup.mutate({ id: g.id, name: newName })}
              onDelete={() => deleteGroup.mutate({ id: g.id })}
              busy={renameGroup.isPending || deleteGroup.isPending}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function GroupRow({ group, onRename, onDelete, busy }: any) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-3">
        {editing ? (
          <>
            <Input className="h-10 w-72" value={name} onChange={(e) => setName(e.target.value)} />
            <Button
              onClick={() => { onRename(name.trim()); setEditing(false); }}
              disabled={!name.trim() || busy}
            >
              Save
            </Button>
            <Button variant="secondary" onClick={() => { setName(group.name); setEditing(false); }} disabled={busy}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <div className="font-medium">{group.name}</div>
            <div className="text-xs text-muted-foreground font-mono">{group.id}</div>
          </>
        )}
      </div>

      {!editing && (
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing(true)} disabled={busy}>Rename</Button>
          <Button variant="destructive" onClick={onDelete} disabled={busy}>Delete</Button>
        </div>
      )}
    </div>
  );
}

function LinksPanel() {
  const utils = trpc.useUtils();
  const groupsQ = trpc.admin.listGroups.useQuery();
  const themesQ = trpc.themes.getThemes.useQuery(); // or wherever your themes list lives
  const linksQ = trpc.admin.listThemeLinks.useQuery();

  const setThemeGroup = trpc.admin.setThemeGroup.useMutation({
    onSuccess: async () => {
      await utils.admin.listThemeLinks.invalidate();
    },
  });

  const linkMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const row of linksQ.data ?? []) m.set(row.themeId, row.groupId);
    return m;
  }, [linksQ.data]);

  if (groupsQ.isLoading || themesQ.isLoading || linksQ.isLoading) {
    return <div className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (groupsQ.isError) return <div className="text-sm text-destructive">{groupsQ.error.message}</div>;
  if (themesQ.isError) return <div className="text-sm text-destructive">{themesQ.error.message}</div>;
  if (linksQ.isError) return <div className="text-sm text-destructive">{linksQ.error.message}</div>;

  const groups = groupsQ.data ?? [];
  const themes = themesQ.data ?? [];

  return (
    <section className="rounded-lg border bg-background p-4 shadow-sm space-y-4">
      <h2 className="text-xl font-medium">Theme → group mapping</h2>

      {themes.length === 0 ? (
        <EmptyState title="No themes yet" />
      ) : (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 text-left font-medium">Theme</th>
                <th className="py-2 text-left font-medium">Group</th>
              </tr>
            </thead>
            <tbody>
              {themes.map((t: any) => (
                <tr key={t.id} className="border-b last:border-b-0">
                  <td className="py-3">{t.name}</td>
                  <td className="py-3">
                    <select
                      className="h-10 rounded-md border bg-background px-3"
                      value={linkMap.get(t.id) ?? ""}
                      onChange={(e) =>
                        setThemeGroup.mutate({ themeId: t.id, groupId: e.target.value ? e.target.value : null })
                      }
                      disabled={setThemeGroup.isPending}
                    >
                      <option value="">— None —</option>
                      {groups.map((g: any) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function AcledFeedPanel() {
  const utils = trpc.useUtils();

  const enabledQ = trpc.admin.getConfig.useQuery({ key: "acled_enabled" });
  const setConfig = trpc.admin.setConfig.useMutation({
    onSuccess: () => utils.admin.getConfig.invalidate({ key: "acled_enabled" }),
  });
  const runAcled = trpc.admin.runAcled.useMutation();

  const enabled = enabledQ.data === "true";

  function toggle() {
    setConfig.mutate({ key: "acled_enabled", value: enabled ? "false" : "true" });
  }

  return (
    <div className="flex items-start justify-between rounded-md border p-3 gap-4">
      <div className="space-y-1 flex-1">
        <p className="font-medium text-sm">ACLED feed</p>
        <p className="text-xs text-muted-foreground">
          Researcher-validated conflict events (battles, explosions, protests) with geo-coordinates and fatality counts.
          Requires <code className="font-mono">ACLED_API_KEY</code> and <code className="font-mono">ACLED_EMAIL</code> env vars.
        </p>
        {runAcled.isError && (
          <p className="text-xs text-destructive">{runAcled.error.message}</p>
        )}
        {runAcled.isSuccess && (
          <p className="text-xs text-green-600">
            Ingest complete — {runAcled.data.ingestResult.upserted} events upserted in {runAcled.data.durationMs}ms
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {enabledQ.isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Switch
              checked={enabled}
              onCheckedChange={toggle}
              disabled={setConfig.isPending}
            />
          )}
          <span className="text-sm text-muted-foreground">{enabled ? "Enabled" : "Disabled"}</span>
        </div>
        <button
          onClick={() => runAcled.mutate()}
          className="px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
          disabled={runAcled.isPending || !enabled}
        >
          {runAcled.isPending ? "Running…" : "Run ingest"}
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
      {title}
    </div>
  );
}
