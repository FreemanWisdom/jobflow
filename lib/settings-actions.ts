"use server";

import { z } from "zod";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function updateProfileAction(name: string) {
  const { id } = await requireUser();
  const parsed = z.string().trim().min(1).max(100).safeParse(name);
  if (!parsed.success) throw new Error("INVALID_PROFILE");
  return prisma.user.update({ where: { id }, data: { name: parsed.data }, select: { name: true, email: true } });
}
