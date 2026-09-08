import "server-only";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { decrypt, encrypt } from "./session";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(
  userId: number,
  role: Role,
  companyId: number | null = null,
) {
  const expiresAt = new Date(Date.now() + SEVEN_DAYS);
  const session = await encrypt({ userId, role, companyId, expiresAt });

  const cookieStore = await cookies();
  cookieStore.set("session", session, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;
  if (!session) return null;

  const payload = await decrypt(session);
  if (!payload) return null;

  return payload;
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
