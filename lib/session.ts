import "server-only";

import { getSession } from "./auth-server";

export async function requireUser() {
  const session = (await getSession()) as { user?: { id?: string; name?: string | null; email?: string | null } } | null;
  const user = session?.user;
  if (!user?.id) {
    throw new Error("UNAUTHENTICATED");
  }
  return user as { id: string; name?: string | null; email?: string | null };
}
