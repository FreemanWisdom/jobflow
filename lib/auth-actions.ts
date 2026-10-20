import "server-only";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { prisma } from "./prisma";

export async function registerUser(formData: FormData) {
  "use server";
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name || !email || !password || password.length < 8 || password !== confirmPassword) {
    redirect("/register?error=invalid");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect("/register?error=exists");

  const passwordHash = await hash(password, 12);
  await prisma.user.create({ data: { name, email, passwordHash } });
  redirect("/sign-in?registered=1");
}
