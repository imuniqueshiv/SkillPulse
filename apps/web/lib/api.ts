const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApplicationUser = {
  id: string;
  clerkUserId: string;
  role: string;
  organizationId: string | null;
};

export async function fetchCurrentUser(token: string): Promise<ApplicationUser> {
  const response = await fetch(`${apiBase}/api/v1/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load application user");
  }

  const body = (await response.json()) as { user: ApplicationUser };
  return body.user;
}
