import type { Request, Response } from "express";

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "analyst";
  analystGroupId: string | null; 
};

export type TRPCContext = {
  req: Request;
  res: Response;
  user: AuthUser | null;
};

export function createContext({ req, res }: { req: Request; res: Response }): TRPCContext {
  const user = req.session?.user ?? null;
  return { req, res, user };
}
