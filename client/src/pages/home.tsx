import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Database, Zap, Code2, Server, CheckCircle2 } from "lucide-react";

export default function Home() {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const healthQuery = trpc.health.useQuery();
  const usersQuery = trpc.getUsers.useQuery();

  const createUserMutation = trpc.createUser.useMutation({
    onSuccess: () => {
      usersQuery.refetch();
      setUsername("");
      setPassword("");
      toast({
        title: "User Created",
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
        title: "User Deleted",
        description: "User has been removed from the database.",
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && password) {
      createUserMutation.mutate({ username, password });
    }
  };

  const techStack = [
    { name: "React", icon: Code2, color: "text-blue-500" },
    { name: "TypeScript", icon: Code2, color: "text-blue-600" },
    { name: "tRPC", icon: Zap, color: "text-purple-500" },
    { name: "React Query", icon: Database, color: "text-red-500" },
    { name: "PostgreSQL", icon: Database, color: "text-blue-400" },
    { name: "Drizzle ORM", icon: Server, color: "text-green-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Horizon Lite
          </h1>
          
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {techStack.map((tech) => (
            <Card key={tech.name} className="hover-elevate">
              <CardContent className="flex items-center gap-4 p-4">
                <tech.icon className={`h-8 w-8 ${tech.color}`} />
                <div>
                  <p className="font-medium">{tech.name}</p>
                  <p className="text-sm text-muted-foreground">Integrated</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                API Health
              </CardTitle>
              <CardDescription>
                tRPC endpoint status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {healthQuery.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </div>
              ) : healthQuery.data ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <Badge variant="secondary">
                      Status: {healthQuery.data.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">
                    {healthQuery.data.timestamp}
                  </p>
                </div>
              ) : (
                <p className="text-destructive">Connection failed</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create User
              </CardTitle>
              <CardDescription>
                Add a new user to the database
              </CardDescription>
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Users
              {usersQuery.data && (
                <Badge variant="secondary" className="ml-2">
                  {usersQuery.data.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Users stored in PostgreSQL database
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : usersQuery.data && usersQuery.data.length > 0 ? (
              <div className="space-y-2">
                {usersQuery.data.map((user) => (
                  <div
                    key={user.id}
                    data-testid={`row-user-${user.id}`}
                    className="flex items-center justify-between p-4 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground font-mono">
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
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No users yet</p>
                <p className="text-sm">Create your first user above</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
