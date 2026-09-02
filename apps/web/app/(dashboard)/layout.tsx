import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

const nav = [
  ["Dashboard", "/dashboard"],
  ["Jobs", "/jobs"],
  ["Skills", "/skills"],
  ["Courses", "/courses"],
  ["Curricula", "/curricula"],
  ["Gaps", "/gaps"],
  ["Recommendations", "/recommendations"],
  ["Employers", "/employers"],
  ["Outcomes", "/outcomes"],
  ["Settings", "/settings"],
] as const;

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/dashboard" className="font-semibold text-zinc-950 dark:text-zinc-50">
            SkillPulse
          </Link>
          <nav className="hidden flex-wrap gap-3 text-sm text-zinc-600 md:flex dark:text-zinc-400">
            {nav.map(([label, href]) => (
              <Link key={href} href={href} className="hover:text-zinc-950 dark:hover:text-zinc-50">
                {label}
              </Link>
            ))}
          </nav>
          <UserButton />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
