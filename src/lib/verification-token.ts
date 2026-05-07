/**
 * Client-side document authentication code for printed / PDF reports.
 * Tied to this installation's `limsInstanceId` so arbitrary browsers that only
 * share the same seeded accession IDs do not receive a false positive match.
 */
export function buildResultVerificationToken(
  orderId: string,
  orderCreatedAt: string,
  limsInstanceId: string,
): string {
  const s = `${orderId}|${orderCreatedAt}|${limsInstanceId}`;
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function verifyResultToken(
  orderId: string,
  orderCreatedAt: string,
  limsInstanceId: string,
  token: string | null,
): boolean {
  if (!token) return false;
  return (
    buildResultVerificationToken(orderId, orderCreatedAt, limsInstanceId) ===
    token
  );
}
