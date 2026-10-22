"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const links = [
  ["Dashboard", "/"],
  ["Jobs", "/jobs"],
  ["Tasks", "/tasks"],
  ["Activity", "/activity"],
  ["Settings", "/settings"],
] as const;

function activePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" || pathname === "/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AuthenticatedNavigation({ user, children }: { user: { name?: string | null; email?: string | null }; children: ReactNode }) {
  const pathname = usePathname();
  const initials = (user.name ?? user.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--background)] lg:flex-row">
      <aside className="hidden w-72 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-6 lg:flex lg:flex-col">
        <Link href="/" className="px-3 text-lg font-semibold tracking-[-0.03em] text-[color:var(--foreground)]">
          JobFlow
        </Link>
        <nav className="mt-10 space-y-1" aria-label="Application navigation">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={activePath(pathname, href) ? "page" : undefined}
              className={`flex h-11 items-center rounded-md px-3 text-sm font-medium transition ${
                activePath(pathname, href)
                  ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[color:var(--accent)]"
                  : "text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--foreground)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-[color:var(--border)] pt-5">
          <div className="flex items-center gap-3 px-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[color:var(--foreground)] text-xs font-bold text-[color:var(--surface)]">{initials}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{user.name ?? "JobFlow user"}</p>
              <p className="truncate text-xs text-[color:var(--text-muted)]">{user.email}</p>
            </div>
          </div>
          <Link href="/api/auth/signout?callbackUrl=/sign-in" className="mt-4 block rounded-md px-3 py-2 text-sm font-medium text-[color:var(--text-muted)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--foreground)]">
            Sign out
          </Link>
        </div>
      </aside>
      <header className="border-b border-[color:var(--border)] bg-[color:var(--surface)] lg:hidden">
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="text-lg font-semibold tracking-[-0.03em]">JobFlow</Link>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[color:var(--foreground)] text-[10px] font-bold text-[color:var(--surface)]">{initials}</span>
        </div>
        <nav className="flex overflow-x-auto border-t border-[color:var(--border)] px-2" aria-label="Mobile application navigation">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={activePath(pathname, href) ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold ${
                activePath(pathname, href)
                  ? "border-[color:var(--accent)] text-[color:var(--accent)]"
                  : "border-transparent text-[color:var(--text-muted)]"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
