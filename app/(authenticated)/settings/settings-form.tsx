"use client";

import { useMemo, useState } from "react";
import { useTheme, type Theme } from "@/app/theme-provider";
import { changePasswordAction, exportDataAction } from "@/lib/account-actions";
import { updateProfileAction } from "@/lib/settings-actions";

const inputClass = "mt-2 w-full rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] px-3 py-2.5 text-sm text-[color:var(--foreground)] shadow-sm outline-none transition placeholder:text-[color:var(--text-muted)] focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--accent)_18%,transparent)]";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5 shadow-sm sm:p-6"><div><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-sm text-[color:var(--text-muted)]">{description}</p></div><div className="mt-5">{children}</div></section>;
}

export function SettingsForm({ initialName, email }: { initialName: string; email: string }) {
  const [name, setName] = useState(initialName);
  const [statusMessage, setStatusMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirmation: "" });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  async function submitProfile(event: React.FormEvent) {
    event.preventDefault();
    setSavingProfile(true);
    setStatusMessage("");
    try {
      const user = await updateProfileAction(name);
      setName(user.name ?? "");
      setStatusMessage("Profile updated.");
    } catch {
      setStatusMessage("We could not update your profile right now.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function submitPassword(event: React.FormEvent) {
    event.preventDefault();
    setChangingPassword(true);
    setPasswordMessage("");
    try {
      await changePasswordAction(passwords.current, passwords.next, passwords.confirmation);
      setPasswords({ current: "", next: "", confirmation: "" });
      setPasswordMessage("Password updated successfully.");
    } catch {
      setPasswordMessage("Current password is incorrect or the new password confirmation does not match.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const data = await exportDataAction();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `jobflow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  const themeLabel = useMemo(() => `${theme} theme`, [theme]);

  return (
    <div className="mt-8 space-y-6">
      <Section title="Profile" description="Keep your identity and contact details current.">
        <form onSubmit={submitProfile} className="space-y-4">
          <label className="block text-sm font-medium">
            Name
            <input value={name} onChange={event => setName(event.target.value)} maxLength={100} className={inputClass} />
          </label>
          <label className="block text-sm font-medium">
            Email
            <input value={email} readOnly className={`${inputClass} cursor-not-allowed bg-[color:var(--surface-muted)] text-[color:var(--text-muted)]`} />
          </label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button disabled={savingProfile} className="inline-flex items-center justify-center rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
              {savingProfile ? "Saving..." : "Save profile"}
            </button>
            <p className="text-sm text-[color:var(--text-muted)]" role="status">
              {statusMessage || "Changes are saved to your account."}
            </p>
          </div>
        </form>
      </Section>

      <Section title="Preferences" description="Choose how JobFlow should look and behave.">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            Theme
            <select value={theme} onChange={event => setTheme(event.target.value as Theme)} className={inputClass}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
          <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface-muted)] p-4 text-sm text-[color:var(--text-muted)]">
            <p className="font-medium text-[color:var(--foreground)]">Current theme</p>
            <p className="mt-1">{themeLabel} is active as {resolvedTheme} mode.</p>
          </div>
        </div>
      </Section>

      <Section title="Security" description="Change your password without affecting your account access.">
        <form onSubmit={submitPassword} className="space-y-4">
          <label className="block text-sm font-medium">
            Current password
            <input required minLength={8} type="password" value={passwords.current} onChange={event => setPasswords(current => ({ ...current, current: event.target.value }))} className={inputClass} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              New password
              <input required minLength={8} type="password" value={passwords.next} onChange={event => setPasswords(current => ({ ...current, next: event.target.value }))} className={inputClass} />
            </label>
            <label className="block text-sm font-medium">
              Confirm new password
              <input required minLength={8} type="password" value={passwords.confirmation} onChange={event => setPasswords(current => ({ ...current, confirmation: event.target.value }))} className={inputClass} />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button disabled={changingPassword} className="inline-flex items-center justify-center rounded-md bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-[color:var(--accent-foreground)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60">
              {changingPassword ? "Updating..." : "Change password"}
            </button>
            <p className="text-sm text-[color:var(--text-muted)]" role="status">
              {passwordMessage || "Use a strong password that you have not used elsewhere."}
            </p>
          </div>
        </form>
      </Section>

      <Section title="Backup" description="Export your Jobs, tasks, and activity for safekeeping or migration.">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[color:var(--text-muted)]">Your export is a portable JSON archive containing your personal workspace data.</p>
          <button onClick={exportData} disabled={exporting} className="inline-flex items-center justify-center rounded-md border border-[color:var(--border-strong)] px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-[color:var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60">
            {exporting ? "Preparing..." : "Export my data"}
          </button>
        </div>
      </Section>
    </div>
  );
}
