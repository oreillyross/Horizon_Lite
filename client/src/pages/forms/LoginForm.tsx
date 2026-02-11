import { useState } from "react";
import { Link, useLocation } from "wouter";
import {Loader2} from "lucide-react"
import { trpc } from "@/lib/trpc";

export default function LoginForm() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      // refresh session cache so Navbar + SessionGate update
      await utils.auth.getSession.invalidate();
      setLocation("/");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Login
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              disabled={loginMutation.isPending}
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Password
            </label>
            <input
              type="password"
              disabled={loginMutation.isPending}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end">
            <Link
              href="/reset-password"
              className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>


          {loginMutation.error && (
            <div className="text-sm text-red-500">
              {loginMutation.error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {loginMutation.isPending ? "Logging in…" : "Login"}
            </span>
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link
            href="/signup"
            className="text-foreground underline underline-offset-4"
          >
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
