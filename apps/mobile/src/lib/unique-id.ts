/**
 * Returns a unique id. Hermes ships no Web Crypto, so `crypto.randomUUID` is
 * used only when a runtime provides it. Callers need uniqueness (idempotency
 * keys, device ids), not cryptographic strength.
 */
export function createUniqueId(): string {
  const webCrypto: { randomUUID?: () => string } | undefined = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") return webCrypto.randomUUID();
  const randomPart = () => Math.random().toString(36).slice(2, 10).padEnd(8, "0");
  return `${Date.now().toString(36)}-${randomPart()}-${randomPart()}-${randomPart()}`;
}
