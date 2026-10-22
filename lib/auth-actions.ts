"use server";

import { redirect } from "next/navigation";
import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type RegisterFormState = {
  error?: string;
  values?: { name: string; email: string };
};

/**
 * Creates a credentials account. Returns typed error state (preserving the
 * user's input) instead of redirecting through error URLs; redirects to the
 * sign-in page on success. Duplicate-email races are caught at the database
 * constraint, not just by the pre-check.
 */
export async function registerUser(_prev: RegisterFormState, formData: FormData): Promise<RegisterFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const values = { name, email };

  if (!name || !email || !password) return { error: "Please fill in every field to create your account.", values };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", values };
  if (password.length < 8) return { error: "Your password must be at least 8 characters long.", values };
  if (password !== confirmPassword) return { error: "The passwords you entered do not match.", values };

  try {
    await prisma.user.create({ data: { name, email, passwordHash: await hash(password, 12) }, select: { id: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "An account with this email already exists. Try signing in instead.", values };
    }
    console.error("JobFlow registration error", error);
    return { error: "We could not create your account right now. Please try again.", values };
  }
  redirect("/sign-in?registered=1");
}
