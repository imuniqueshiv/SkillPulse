import type { UserRole } from "@prisma/client";

export type RequestAuth = {
  clerkUserId: string;
};

export type RequestUser = {
  id: string;
  clerkUserId: string;
  role: UserRole;
  organizationId: string | null;
};

declare global {
  namespace Express {
    interface Request {
      auth?: RequestAuth;
      user?: RequestUser;
    }
  }
}

export {};
