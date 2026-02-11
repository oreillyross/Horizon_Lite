import { Redirect } from "wouter";
import { useSession } from "@/hooks/useSession";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useSession();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect to="/" />;
  return <>{children}</>;
}
