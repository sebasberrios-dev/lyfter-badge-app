import { NextRequest, NextResponse } from "next/server";
import { registerSchema } from "@/modules/users/users.schema";
import z from "zod";
import { register } from "@/modules/users/users.service";
import { EmailAlreadyExistsError } from "@/modules/users/users.errors";
import { createSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const parsed = registerSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const user = await register(parsed.data);

    await createSession(user.id, user.role);

    return NextResponse.json({ id: user.id, role: user.role });
  } catch (err) {
    if (err instanceof EmailAlreadyExistsError) {
      return NextResponse.json(
        { error: "el correo ya está asociado a una cuenta" },
        { status: 409 },
      );
    }

    console.error(err);
    return NextResponse.json({ error: "error del servidor" }, { status: 500 });
  }
}
