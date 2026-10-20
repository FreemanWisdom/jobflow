import Link from "next/link";
import { registerUser } from "@/lib/auth-actions";
import { GoogleAuthButton } from "@/app/components/google-auth-button";

const inputClass = "mt-2 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]";

export default function RegisterPage() {
  return (
    <main className="min-h-screen px-5 py-12 text-[color:var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <div className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">JobFlow</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Create account</h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">Set up a workspace with email and password or Google authentication.</p>
          <div className="mt-6"><GoogleAuthButton enabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} /></div>
          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-[color:var(--text-muted)]"><span className="h-px flex-1 bg-[color:var(--border)]" />or use email<span className="h-px flex-1 bg-[color:var(--border)]" /></div>
          <form action={registerUser} className="space-y-4">
            <label className="block text-sm font-medium">
              Name
              <input name="name" placeholder="Your name" required autoComplete="name" className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Email
              <input name="email" type="email" placeholder="you@example.com" required autoComplete="email" className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input name="password" type="password" placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Confirm password
              <input name="confirmPassword" type="password" placeholder="Repeat your password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </label>
            <button className="w-full rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] transition hover:opacity-95">
              Create account
            </button>
          </form>
          <p className="mt-4 text-sm text-[color:var(--text-muted)]">
            Already have an account? <Link href="/sign-in" className="font-semibold text-[color:var(--accent)]">Sign in</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
