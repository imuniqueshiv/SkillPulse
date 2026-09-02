import { verifyToken } from "@clerk/backend";
import { env } from "../../config/env";
import { AppError } from "../../utils/errors";

export type ClerkIdentity = {
  clerkUserId: string;
};

export type ClerkTokenVerifier = (token: string) => Promise<ClerkIdentity>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clerkUserIdFromPayload(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  if (isRecord(payload.data) && typeof payload.data.sub === "string") {
    return payload.data.sub;
  }

  if (typeof payload.sub === "string") {
    return payload.sub;
  }

  return undefined;
}

const defaultVerifier: ClerkTokenVerifier = async (token) => {
  if (!env.CLERK_SECRET_KEY) {
    throw new AppError(401, "Unauthorized");
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });
    const clerkUserId = clerkUserIdFromPayload(payload);

    if (!clerkUserId) {
      throw new AppError(401, "Unauthorized");
    }

    return { clerkUserId };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(401, "Unauthorized");
  }
};

let verifier: ClerkTokenVerifier = defaultVerifier;

export function setClerkTokenVerifier(next: ClerkTokenVerifier): void {
  verifier = next;
}

export function resetClerkTokenVerifier(): void {
  verifier = defaultVerifier;
}

export async function verifyClerkAccessToken(token: string): Promise<ClerkIdentity> {
  return verifier(token);
}
