/**
 * Criptografia AES-256-GCM para credenciais sensíveis (Z-API tokens).
 *
 * A chave de criptografia deve ser definida em:
 * - Produção: Firebase Secret Manager → variável ZAPI_ENCRYPTION_KEY
 *   Configurar com: firebase functions:secrets:set ZAPI_ENCRYPTION_KEY
 * - Desenvolvimento: variável de ambiente ZAPI_ENCRYPTION_KEY (32 bytes hex = 64 chars)
 *
 * Se a chave não estiver definida, os valores são armazenados em texto plano
 * (backward compatible com dados existentes).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const ENCRYPTED_PREFIX = "enc:";

function getEncryptionKey(): Buffer | null {
  const keyHex = process.env.ZAPI_ENCRYPTION_KEY;
  if (!keyHex) return null;

  const key = Buffer.from(keyHex, "hex");
  if (key.length !== 32) {
    throw new Error("ZAPI_ENCRYPTION_KEY deve ter 32 bytes (64 caracteres hex)");
  }
  return key;
}

/**
 * Criptografa um valor. Retorna string no formato "enc:iv:authTag:ciphertext" (base64).
 * Se a chave não estiver configurada, retorna o valor original.
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  if (!key) return plaintext;

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");

  const authTag = cipher.getAuthTag();

  return `${ENCRYPTED_PREFIX}${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
}

/**
 * Descriptografa um valor. Se não tem o prefixo "enc:", assume que é texto plano
 * (backward compatible com dados existentes antes da criptografia).
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    return ciphertext; // Texto plano (backward compatible)
  }

  const key = getEncryptionKey();
  if (!key) {
    throw new Error("ZAPI_ENCRYPTION_KEY não configurada mas dados estão criptografados");
  }

  const parts = ciphertext.slice(ENCRYPTED_PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Formato de dado criptografado inválido");
  }

  const iv = Buffer.from(parts[0], "base64");
  const authTag = Buffer.from(parts[1], "base64");
  const encrypted = parts[2];

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}
