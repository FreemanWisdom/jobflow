"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerUser, type RegisterFormState } from "@/lib/auth-actions";
import { GoogleAuthButton } from "@/app/components/google-auth-button";

const inputClass = "mt-2 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]";

const initialState: RegisterFormState = {};

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const [state, formAction, pending] = useActionState(registerUser, initialState);

  return (
    <>
      <GoogleAuthButton enabled={googleEnabled} />
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]"><span className="h-px flex-1 bg-[color:var(--border)]" />or use email<span className="h-px flex-1 bg-[color:var(--border)]" /></div>
      <form action={formAction} className="space-y-4">
        {state.error && <p role="alert" className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm font-medium text-[color:var(--danger)]">{state.error}</p>}
        <label className="block text-sm font-medium">
          Name
          <input name="name" placeholder="Your name" required defaultValue={state.values?.name ?? ""} maxLength={100} autoComplete="name" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" placeholder="you@example.com" required defaultValue={state.values?.email ?? ""} autoComplete="email" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Password
          <input name="password" type="password" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" className={inputClass} />
        </label>
        <label className="block text-sm font-medium">
          Confirm password
          <input name="confirmPassword" type="password" placeholder="Repeat your password" required minLength={8} autoComplete="new-password" className={inputClass} />
        </label>
        <button disabled={pending} className="w-full rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
          {pending ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-sm text-[color:var(--text-muted)]">
        Already have an account? <Link href="/sign-in" className="font-semibold text-[color:var(--accent)]">Sign in</Link>
      </p>
    </>
  );
}
