export type QrTokenPayload = {
  badgeId: number;
  eventId: number;
};

export type QrTokenVerificationResult =
  | { valid: true; payload: QrTokenPayload }
  | { valid: false; reason: "expired" | "invalid" };
