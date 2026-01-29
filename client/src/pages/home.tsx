import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

import {
  CheckCircle2,
  Code2,
  Database,
  ExternalLink,
  Loader2,
  Plus,
  Server,
  Trash2,
  Zap,
} from "lucide-react";

export default function Home() {
  const { toast } = useToast();

  // ---- server state ----
  const healthQuery = trpc.health.useQuery();
  const usersQuery = trpc.getUsers.useQuery();
  const snippetsQuery = trpc.getSnippets.useQuery();

  const {data} = trpc.getTags.useQuery()
  console.log("TAGS", data)

  const snippets = snippetsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const recentSnippets = useMemo(() => {
    // If createdAt exists, sort by that; otherwise just take the last items.
    const copy = [...snippets];
    copy.sort((a: any, b: any) => {
      const ad = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
    return copy.slice(0, 5);
  }, [snippets]);

  // ---- local state ----
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const createUserMutation = trpc.createUser.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      setUsername("");
      setPassword("");
      toast({
        title: "User created",
        description: "New user has been added to the database.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = trpc.deleteUser.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      toast({
        title: "User deleted",
        description: "User has been removed from the database.",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    createUserMutation.mutate({ username, password });
  };

  const apiStatus = healthQuery.isLoading
    ? "Checking…"
    : healthQuery.data
      ? "Online"
      : "Offline";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 lg:px-8 py-8 max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex items-start justify-between gap-6">
          <div className="space-y-1">
           
            <p className="text-sm text-muted-foreground">
              Snippet Manager for working quickly at compiling informations that matters.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/snippet/show">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                View Snippets
              </Button>
            </Link>

            <Link href="/snippet/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Snippet
              </Button>
            </Link>
          </div>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Code2 className="h-5 w-5" />
                  Snippets
                </span>
                <Badge variant="secondary" className="font-mono">
                  {snippetsQuery.isLoading ? "…" : String(snippets.length)}
                </Badge>
              </CardTitle>
              <CardDescription>Stored code snippets with tags</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {snippetsQuery.isLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading…
                </div>
              ) : snippets.length > 0 ? (
                <p>Recent activity below.</p>
              ) : (
                <p>No snippets yet. Create your first one.</p>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Users
                </span>
                <Badge variant="secondary" className="font-mono">
                  {usersQuery.isLoading ? "…" : String(users.length)}
                </Badge>
              </CardTitle>
              <CardDescription>Rows in PostgreSQL (users)</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Manage users in the admin panel below.
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  API Health
                </span>
                <Badge variant={apiStatus === "Online" ? "secondary" : "destructive"} className="font-mono">
                  {apiStatus}
                </Badge>
              </CardTitle>
              <CardDescription>tRPC endpoint status</CardDescription>
            </CardHeader>
            <CardContent>
              {healthQuery.isLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking…
                </div>
              ) : healthQuery.data ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      Status: <span className="font-medium text-foreground">{healthQuery.data.status}</span>
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    {healthQuery.data.timestamp}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <Zap className="h-4 w-4" />
                  Connection failed
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent snippets */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              Recent snippets
            </CardTitle>
            <CardDescription>Your latest saved items (top 5)</CardDescription>
          </CardHeader>
          <CardContent>
            {snippetsQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : recentSnippets.length > 0 ? (
              <div className="space-y-2">
                {recentSnippets.map((s: any) => (
                  <div
                    key={s.id}
                    className="flex items-start justify-between gap-4 p-4 rounded-md bg-muted/50"
                  >
                    <div className="min-w-0 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {String(s.content ?? "").slice(0, 80) || "(empty)"}
                          {String(s.content ?? "").length > 80 ? "…" : ""}
                        </p>
                        {Array.isArray(s.tags) && s.tags.length > 0 ? (
                          <Badge variant="secondary" className="font-mono">
                            {s.tags.length} tag{s.tags.length > 1 ? "s" : ""}
                          </Badge>
                        ) : null}
                      </div>

                      {Array.isArray(s.tags) && s.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {s.tags.slice(0, 6).map((t: string) => (
                            <Badge key={t} variant="outline" className="font-mono">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No tags</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <Link href={`/snippet/edit/${s.id}`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Code2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No snippets yet</p>
                <p className="text-sm">Create your first snippet to see activity here.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin / DB panel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create user
              </CardTitle>
              <CardDescription>Add a new user row (dev/admin)</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    data-testid="input-username"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    data-testid="input-password"
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  data-testid="button-create-user"
                  disabled={createUserMutation.isPending || !username || !password}
                  className="w-full"
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create user
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Users
                {usersQuery.data && (
                  <Badge variant="secondary" className="ml-2 font-mono">
                    {usersQuery.data.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Users stored in PostgreSQL</CardDescription>
            </CardHeader>
            <CardContent>
              {usersQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : users.length > 0 ? (
                <div className="space-y-2">
                  {users.map((user: any) => (
                    <div
                      key={user.id}
                      data-testid={`row-user-${user.id}`}
                      className="flex items-center justify-between p-4 rounded-md bg-muted/50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {String(user.username ?? "?").charAt(0).toUpperCase()}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <p className="font-medium truncate">{user.username}</p>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {user.id}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        data-testid={`button-delete-${user.id}`}
                        onClick={() => deleteUserMutation.mutate({ id: user.id })}
                        disabled={deleteUserMutation.isPending}
                        aria-label={`Delete user ${user.username}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No users yet</p>
                  <p className="text-sm">Create your first user on the left.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
