import { SignInForm } from "./sign-in-form";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ registered?: string }> }) {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const { registered } = await searchParams;

  return (
    <main className="min-h-screen px-5 py-12 text-[color:var(--foreground)]">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-md items-center">
        <div className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">JobFlow</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Sign in</h1>
          <p className="mt-2 text-sm text-[color:var(--text-muted)]">Access your workspace with email and password, or continue with Google.</p>
          {registered && <p role="status" className="mt-6 rounded-md border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-3 text-sm font-medium">Your account was created. Sign in to continue.</p>}
          <div className="mt-6"><SignInForm googleEnabled={googleEnabled} /></div>
        </div>
      </div>
    </main>
  );
}
