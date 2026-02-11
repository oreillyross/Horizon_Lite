import { useState } from "react";
import { Link } from "wouter";
import { useSession } from "@/hooks/useSession";

export default function ResetPasswordForm() {
  const { isAuthenticated } = useSession();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (isAuthenticated) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="text-muted-foreground">
          You are already logged in.
        </div>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Later: call trpc.auth.requestPasswordReset
    setSubmitted(true);
  }

  return (
    <div className="min-h-[70vh] grid place-items-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Reset Password
        </h1>

        {!submitted ? (
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

            <button
              type="submit"
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Send Reset Link
            </button>
          </form>
        ) : (
          <div className="text-sm text-muted-foreground">
            If an account exists for <strong>{email}</strong>, a reset link
            will be sent.
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/"
            className="text-foreground underline underline-offset-4"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
