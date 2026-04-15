import type { Request, Response } from "express";
import {db} from "../db"


export type TRPCContext = Awaited<ReturnType<typeof createContext>>;

export function createContext({ req, res }: { req: Request; res: Response }) {
  const user = req.session?.user ?? null;
  return { req, res, db, user };
}
