import "express-session";

declare module "express-session" {
  interface SessionData {
    user?: {
      id: string;
      role: "admin" | "analyst";
      analystGroupId: string | null;
    };
  }
}
