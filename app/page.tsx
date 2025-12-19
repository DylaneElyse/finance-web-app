// import { DeployButton } from "@/components/deploy-button";
// import { EnvVarWarning } from "@/components/env-var-warning";
// import { AuthButton } from "@/components/auth-button";
// import { Hero } from "@/components/hero";
// import { ThemeSwitcher } from "@/components/theme-switcher";
// import { ConnectSupabaseSteps } from "@/components/tutorial/connect-supabase-steps";
// import { SignUpUserSteps } from "@/components/tutorial/sign-up-user-steps";
// import { hasEnvVars } from "@/lib/utils";
// import Link from "next/link";
// import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
// import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <header className="w-full max-w-3xl p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Finance Tracker App</h1>
      </header>
      <div className="flex-grow w-full max-w-3xl p-4">
        <LoginForm />
      </div>
    </main>
  );
}
