import { createHash, timingSafeEqual } from "node:crypto";

const CODE_VERIFIER_MIN_LENGTH = 43;
const CODE_VERIFIER_MAX_LENGTH = 128;
const CODE_VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]+$/;

/** RFC 7636 §4.1: 43–128 chars of unreserved characters. */
export function isValidCodeVerifier(verifier: string): boolean {
  if (verifier.length < CODE_VERIFIER_MIN_LENGTH || verifier.length > CODE_VERIFIER_MAX_LENGTH) {
    return false;
  }
  return CODE_VERIFIER_PATTERN.test(verifier);
}

/** RFC 7636 §4.6: S256 only. base64url(sha256(verifier)) === challenge, timing-safe. */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!isValidCodeVerifier(verifier)) return false;

  const expected = createHash("sha256").update(verifier).digest("base64url");
  const expectedBuffer = Buffer.from(expected);
  const challengeBuffer = Buffer.from(challenge);

  if (expectedBuffer.length !== challengeBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, challengeBuffer);
}
