import { Role } from "@prisma/client";

export type SessionPayload = {
  userId: number;
  role: Role;
  companyId: number | null;
  expiresAt: Date;
};
