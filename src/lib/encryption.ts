import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.FIELD_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error("FIELD_ENCRYPTION_KEY must be configured");
  }

  const key = Buffer.from(keyBase64, "base64");
  if (key.length !== 32) {
    throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes (base64-encoded)");
  }

  return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns a string in the format: base64(iv + authTag + ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack: iv (12) + authTag (16) + ciphertext
  const packed = Buffer.concat([iv, authTag, encrypted]);
  return packed.toString("base64");
}

/**
 * Decrypt a string encrypted with `encrypt()`.
 * Input format: base64(iv + authTag + ciphertext)
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();
  const packed = Buffer.from(encrypted, "base64");

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error("Invalid encrypted data");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = packed.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Try to decrypt a value. If it fails (e.g. plaintext legacy data), return the original string.
 * Useful during migration from plaintext to encrypted storage.
 */
export function decryptOrPassthrough(value: string): string {
  try {
    return decrypt(value);
  } catch {
    // Value is likely plaintext (pre-encryption) — return as-is
    return value;
  }
}
