import z from "zod";
import { loginSchema } from "@/modules/users/users.schema";
import { NextRequest, NextResponse } from "next/server";
import { login } from "@/modules/users/users.service";
import { InvalidCredentialsError } from "@/modules/users/users.errors";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const parsed = loginSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const user = await login(parsed.data);

    await createSession(user.id, user.role, user.companyId);

    return NextResponse.json({ id: user.id, role: user.role });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      return NextResponse.json(
        { error: "credenciales inválidas" },
        { status: 401 },
      );
    }

    console.error(err);
    return NextResponse.json({ error: "error del servidor" }, { status: 500 });
  }
}
