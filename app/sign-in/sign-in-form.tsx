"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { GoogleAuthButton } from "@/app/components/google-auth-button";

const inputClass = "mt-2 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]";

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) setError("Invalid email or password.");
    else router.push("/dashboard");
  }

  return (
    <>
      <GoogleAuthButton enabled={googleEnabled} />
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]">
        <span className="h-px flex-1 bg-[color:var(--border)]" />
        or use email
        <span className="h-px flex-1 bg-[color:var(--border)]" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" placeholder="you@example.com" required autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input name="password" type="password" placeholder="Your password" required minLength={8} autoComplete="current-password" className={inputClass} />
        </label>
        {error && <p role="alert" className="rounded-md border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] p-3 text-sm font-medium text-[color:var(--danger)]">{error}</p>}
        <button disabled={loading} className="w-full rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[color:var(--text-muted)]">
        No account? <Link href="/register" className="font-semibold text-[color:var(--accent)]">Register</Link>
      </p>
    </>
  );
}
