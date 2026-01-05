import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // Mock user for development/bypass
  const user: User = {
    id: 1,
    openId: "mock-admin-openid",
    name: "Admin User",
    email: "admin@example.com",
    role: "admin",
    userType: "master",
    loginMethod: "mock",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  /* 
  // Original Authentication Logic
  let user: User | null = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }
  */

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
