import { Prisma } from "@prisma/client";
import { env } from "../../config/env";
import { getPrisma } from "../../config/database";
import type { RequestUser } from "../../types/express";

function toRequestUser(user: {
  id: string;
  clerkUserId: string;
  role: RequestUser["role"];
  organizationId: string | null;
}): RequestUser {
  return {
    id: user.id,
    clerkUserId: user.clerkUserId,
    role: user.role,
    organizationId: user.organizationId,
  };
}

export async function syncApplicationUser(clerkUserId: string): Promise<RequestUser> {
  const prisma = getPrisma();

  const existing = await prisma.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      clerkUserId: true,
      role: true,
      organizationId: true,
    },
  });

  if (existing) {
    if (env.devDefaultRole && existing.role === "LEARNER") {
      const promoted = await prisma.user.update({
        where: { clerkUserId },
        data: { role: env.devDefaultRole },
        select: {
          id: true,
          clerkUserId: true,
          role: true,
          organizationId: true,
        },
      });
      return toRequestUser(promoted);
    }
    return toRequestUser(existing);
  }

  try {
    const created = await prisma.user.create({
      data: {
        clerkUserId,
        role: env.devDefaultRole ?? "LEARNER",
      },
      select: {
        id: true,
        clerkUserId: true,
        role: true,
        organizationId: true,
      },
    });
    return toRequestUser(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.user.findUniqueOrThrow({
        where: { clerkUserId },
        select: {
          id: true,
          clerkUserId: true,
          role: true,
          organizationId: true,
        },
      });
      return toRequestUser(raced);
    }
    throw error;
  }
}
