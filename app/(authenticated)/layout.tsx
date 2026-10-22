import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { AuthenticatedNavigation } from "@/app/components/authenticated-navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const session = (await getSession()) as { user?: { id?: string; name?: string | null; email?: string | null } } | null;
  if (!session?.user?.id) redirect("/sign-in");
  return <div className="min-h-screen bg-stone-50"><AuthenticatedNavigation user={session.user}>{children}</AuthenticatedNavigation></div>;
}
