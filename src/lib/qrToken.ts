import { randomBytes } from "crypto";

export default function generateQrToken(): string {
  return randomBytes(32).toString("base64url");
}
