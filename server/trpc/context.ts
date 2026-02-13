import type { Request, Response } from "express";
import {db} from "../db"

export type AuthUser = {
  id: string;
  email: string;
  role: "admin" | "analyst";
  analystGroupId: string | null; 
};

// export type TRPCContext = {
//   req: Request;
//   res: Response;
//   db: any,
//   user: AuthUser | null;
// };

export type TRPCContext = Awaited<ReturnType<typeof createContext>>;

export function createContext({ req, res }: { req: Request; res: Response }) {
  const user = req.session?.user ?? null;
  return { req, res, db, user };
}
