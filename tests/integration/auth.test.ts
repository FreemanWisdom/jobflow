import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { changePasswordAction } from "@/lib/account-actions";
import { registerUser } from "@/lib/auth-actions";
import { requireUser } from "@/lib/session";

/** Integration tests against the jobflow_test database (see jobs.test.ts). */
vi.mock("@/lib/session", () => ({ requireUser: vi.fn() }));
// registerUser redirects through next/navigation on success; capture it.
vi.mock("next/navigation", () => ({ redirect: vi.fn(() => { throw new Error("NEXT_REDIRECT"); }) }));

const createdEmails: string[] = [];

async function cleanup(emails: string[]) {
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
}

afterEach(async () => {
  await cleanup(createdEmails.splice(0));
});

afterAll(async () => {
  await prisma.$disconnect();
});

function formData(overrides: Record<string, string> = {}) {
  return new Map(Object.entries({
    name: "New User",
    email: `reg-${randomUUID()}@jobflow.test`,
    password: "a-secure-passphrase",
    confirmPassword: "a-secure-passphrase",
    ...overrides,
  })) as unknown as FormData;
}

describe("registerUser", () => {
  it("creates an account with a bcrypt hash and redirects on success", async () => {
    const form = formData();
    const email = form.get("email") as string;
    createdEmails.push(email);
    await expect(registerUser({}, form)).rejects.toThrow("NEXT_REDIRECT");
    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.name).toBe("New User");
    expect(user?.passwordHash).toBeTruthy();
    expect(user?.passwordHash).not.toBe("a-secure-passphrase");
    expect(await compare("a-secure-passphrase", user!.passwordHash!)).toBe(true);
  });

  it("rejects mismatched, short, and empty submissions without creating users", async () => {
    const cases = [
      formData({ confirmPassword: "different-pass" }),
      formData({ password: "short", confirmPassword: "short" }),
      formData({ email: "not-an-email" }),
      formData({ name: "" }),
    ];
    for (const form of cases) {
      const state = await registerUser({}, form);
      expect(state.error).toBeTruthy();
      expect(state.values?.email).toBe(form.get("email"));
    }
    expect(await prisma.user.count({ where: { email: { contains: "@jobflow.test" } } })).toBe(0);
  });

  it("reports duplicates safely for an existing email", async () => {
    const form = formData();
    const email = form.get("email") as string;
    createdEmails.push(email);
    await prisma.user.create({ data: { name: "Existing", email, passwordHash: await hash("existing-pass-1", 12) } });
    const state = await registerUser({}, formData({ email }));
    expect(state.error).toContain("already exists");
    expect(await prisma.user.count({ where: { email } })).toBe(1);
  });
});

describe("changePasswordAction", () => {
  it("changes the password after verifying the current one", async () => {
    const email = `pw-${randomUUID()}@jobflow.test`;
    createdEmails.push(email);
    const user = await prisma.user.create({ data: { name: "PW User", email, passwordHash: await hash("old-passphrase-1", 12) } });
    vi.mocked(requireUser).mockResolvedValue({ id: user.id, email });
    await changePasswordAction("old-passphrase-1", "new-passphrase-2", "new-passphrase-2");
    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await compare("new-passphrase-2", updated!.passwordHash!)).toBe(true);
    // Old password must no longer verify.
    expect(await compare("old-passphrase-1", updated!.passwordHash!)).toBe(false);
  });

  it("refuses a wrong current password and mismatched confirmation", async () => {
    const email = `pw-${randomUUID()}@jobflow.test`;
    createdEmails.push(email);
    const user = await prisma.user.create({ data: { name: "PW User", email, passwordHash: await hash("old-passphrase-1", 12) } });
    vi.mocked(requireUser).mockResolvedValue({ id: user.id, email });
    await expect(changePasswordAction("wrong-password", "new-passphrase-2", "new-passphrase-2")).rejects.toThrow();
    await expect(changePasswordAction("old-passphrase-1", "new-passphrase-2", "mismatch-3")).rejects.toThrow();
    const unchanged = await prisma.user.findUnique({ where: { id: user.id } });
    expect(await compare("old-passphrase-1", unchanged!.passwordHash!)).toBe(true);
  });
});
