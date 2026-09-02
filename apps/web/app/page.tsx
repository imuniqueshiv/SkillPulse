import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-xl flex-col gap-6 rounded-2xl bg-white p-10 shadow-sm dark:bg-zinc-950">
        <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
          Skill development intelligence
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          SkillPulse
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Sign in to open your workspace. Authorization is enforced by the API.
        </p>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton>
              <button className="rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-950 dark:border-zinc-700 dark:text-zinc-50">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-950"
            >
              Dashboard
            </Link>
            <UserButton />
          </Show>
        </div>
      </main>
    </div>
  );
}
