import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[#F5F7FA] px-6 py-16">
      <SignIn />
    </div>
  );
}
