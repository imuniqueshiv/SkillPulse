import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[#F5F7FA] px-6 font-sans">
      <main className="flex w-full max-w-xl flex-col gap-6 rounded-xl bg-white p-10 shadow-sm border border-[#D1D5DB]">
        <p className="text-sm font-medium tracking-wide text-[#6B7280] uppercase">
          Skill development intelligence
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-[#111827]">
          SkillPulse
        </h1>
        <p className="text-lg text-[#6B7280]">
          Sign in to open your workspace. Authorization is enforced by the API.
        </p>
        <div className="flex items-center gap-4">
          <Show when="signed-out">
            <SignInButton>
              <button className="rounded-lg bg-[#005A9C] px-5 py-2 text-sm font-medium text-white hover:bg-[#003B73] transition-colors cursor-pointer">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="rounded-lg border border-[#005A9C] px-5 py-2 text-sm font-medium text-[#005A9C] hover:bg-[#005A9C] hover:text-white transition-colors cursor-pointer">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link
              href="/dashboard"
              className="rounded-lg bg-[#005A9C] px-5 py-2 text-sm font-medium text-white hover:bg-[#003B73] transition-colors"
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
