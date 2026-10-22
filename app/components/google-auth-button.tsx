"use client";

import { signIn } from "next-auth/react";

type GoogleAuthButtonProps = {
  enabled: boolean;
};

export function GoogleAuthButton({ enabled }: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      disabled={!enabled}
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      title={enabled ? "Continue with Google" : "Google sign-in is not configured"}
      className="flex w-full items-center justify-center gap-3 rounded-md border border-[color:var(--border-strong)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[color:var(--surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span aria-hidden="true" className="text-base font-bold leading-none">
        G
      </span>
      {enabled ? "Continue with Google" : "Google sign-in unavailable"}
    </button>
  );
}
