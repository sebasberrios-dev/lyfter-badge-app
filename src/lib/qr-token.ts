import "server-only";
import { SignJWT, jwtVerify } from "jose";
import type {
  QrTokenPayload,
  QrTokenVerificationResult,
} from "./qr-token.types";

const secretKey = process.env.QR_TOKEN_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

const DEFAULT_EXPIRATION = "60s";

export async function signQrToken(
  payload: QrTokenPayload,
  expiresIn: string = DEFAULT_EXPIRATION,
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(encodedKey);
}

export async function verifyQrToken(
  token: string,
): Promise<QrTokenVerificationResult> {
  try {
    const { payload } = await jwtVerify<QrTokenPayload>(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return { valid: true, payload };
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      err.code === "ERR_JWT_EXPIRED"
    ) {
      return { valid: false, reason: "expired" };
    }
    return { valid: false, reason: "invalid" };
  }
}
