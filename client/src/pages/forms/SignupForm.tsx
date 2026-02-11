import { useState } from "react";
import { useLocation, Link, Redirect } from "wouter";
import { trpc } from "@/lib/trpc";
import { useSession } from "@/hooks/useSession";

export default function SignupForm() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { isLoading, isAuthenticated } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (isLoading) return null;
  if (isAuthenticated) return <Redirect to="/" />;

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: async () => {
      // refresh session so Navbar + SessionGate update immediately
      await utils.auth.getSession.invalidate();
      setLocation("/");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    signupMutation.mutate({ email, password });
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Create Account
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">
              Email
            </label>
            <input
              type="email"
              required
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
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {signupMutation.error && (
            <div className="text-sm text-red-500">
              {signupMutation.error.message}
            </div>
          )}

          <button
            type="submit"
            disabled={signupMutation.isPending}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {signupMutation.isPending ? "Creating..." : "Create Account"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/"
            className="text-foreground underline underline-offset-4"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
