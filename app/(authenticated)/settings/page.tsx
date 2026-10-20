import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = (await getSession()) as { user?: { name?: string | null; email?: string | null } } | null;
  if (!session?.user?.email) redirect("/sign-in");
  return (
    <main className="min-h-screen px-5 py-8 text-[color:var(--foreground)] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">Workspace settings</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Settings</h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--text-muted)]">Manage your profile, theme preference, security, and backup data from one place.</p>
          <SettingsForm initialName={session.user.name ?? ""} email={session.user.email} />
          <div className="mt-6 flex items-center justify-between gap-4 border-t border-[color:var(--border)] pt-5">
            <p className="text-sm text-[color:var(--text-muted)]">Signed in as {session.user.email}</p>
            <Link href="/api/auth/signout?callbackUrl=/sign-in" className="text-sm font-semibold text-[color:var(--danger)]">Sign out</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
