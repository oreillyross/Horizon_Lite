import { trpc } from "@/lib/trpc";

export function useSession() {
  const sessionQuery = trpc.auth.getSession.useQuery();

  return {
    user: sessionQuery.data?.user ?? null,
    isLoading: sessionQuery.isLoading,
    isAuthenticated: !!sessionQuery.data?.user,
  };
}
