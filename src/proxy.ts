import { NextRequest, NextResponse } from "next/server";
import { decrypt } from "@/lib/session";

export default async function proxy(req: NextRequest) {
  const cookie = req.cookies.get("session")?.value;
  const session = await decrypt(cookie);

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (session.role === "PARTICIPANT") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
