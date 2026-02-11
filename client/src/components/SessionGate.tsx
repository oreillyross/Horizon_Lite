import React from "react";
import { useSession } from "@/hooks/useSession";
import { Loader2 } from "lucide-react";

export function SessionGate({
  authed,
  unauthed,
}: {
  authed: React.ReactNode;
  unauthed: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useSession();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] grid place-items-center text-muted-foreground">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking session…</span>
        </div>
      </div>
    );
  }


  return (
    <div
      key={isAuthenticated ? "authed" : "unauthed"}
      className="animate-in fade-in duration-200"
    >
      {isAuthenticated ? authed : unauthed}
    </div>
  );
}
