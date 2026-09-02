export const publicPaths = ["/", "/sign-in", "/sign-up"] as const;

export const protectedPathPrefixes = [
  "/dashboard",
  "/jobs",
  "/skills",
  "/courses",
  "/curricula",
  "/gaps",
  "/recommendations",
  "/employers",
  "/outcomes",
  "/settings",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") {
    return true;
  }

  return (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/__clerk")
  );
}

export function isProtectedPath(pathname: string): boolean {
  return protectedPathPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
