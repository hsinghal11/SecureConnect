export interface AllKeyPairs {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
  signingPublicKey: CryptoKey;
  signingPrivateKey: CryptoKey;
}

export type EncryptedMessageEnvelopeV1 = {
  version: 1;
  algorithm: "RSA-OAEP";
  recipients: Record<string, string>;
};

export type LegacyEncryptedMessage = Record<string, string>;

export type EncryptedMessagePayload =
  | EncryptedMessageEnvelopeV1
  | LegacyEncryptedMessage;

const PEM_HEADER_PUBLIC = "-----BEGIN PUBLIC KEY-----";
const PEM_FOOTER_PUBLIC = "-----END PUBLIC KEY-----";
const PEM_HEADER_PRIVATE = "-----BEGIN PRIVATE KEY-----";
const PEM_FOOTER_PRIVATE = "-----END PRIVATE KEY-----";

const ENCRYPTION_ALGORITHM: RsaHashedKeyGenParams = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: "SHA-256",
};

const SIGNING_ALGORITHM: RsaHashedKeyGenParams = {
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
  hash: "SHA-256",
};

function normalizePem(pem: string): string {
  return pem.replace(/\r\n/g, "\n").trim();
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalizedPem = normalizePem(pem);
  const base64 = normalizedPem
    .replace(/-----BEGIN [A-Z ]+-----/g, "")
    .replace(/-----END [A-Z ]+-----/g, "")
    .replace(/\s/g, "");

  if (!base64) {
    throw new Error("Invalid PEM: no Base64 body found");
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function generateKeyPair(): Promise<AllKeyPairs> {
  const encryptionKeyPair = await crypto.subtle.generateKey(
    ENCRYPTION_ALGORITHM,
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );

  const signingKeyPair = await crypto.subtle.generateKey(
    SIGNING_ALGORITHM,
    true,
    ["sign", "verify"]
  );

  return {
    publicKey: encryptionKeyPair.publicKey,
    privateKey: encryptionKeyPair.privateKey,
    signingPublicKey: signingKeyPair.publicKey,
    signingPrivateKey: signingKeyPair.privateKey,
  };
}

export async function exportKeyToPem(
  key: CryptoKey,
  type: "public" | "private"
): Promise<string> {
  const exported = await crypto.subtle.exportKey(
    type === "public" ? "spki" : "pkcs8",
    key
  );
  const base64 = arrayBufferToBase64(exported);
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") ?? base64;
  const header = type === "public" ? PEM_HEADER_PUBLIC : PEM_HEADER_PRIVATE;
  const footer = type === "public" ? PEM_FOOTER_PUBLIC : PEM_FOOTER_PRIVATE;
  return `${header}\n${wrapped}\n${footer}`;
}

export async function importKeyFromPem(
  pem: string,
  type: "public" | "private",
  usages: KeyUsage[]
): Promise<CryptoKey> {
  if (!usages.length) {
    throw new Error("Key usages are required");
  }

  const forSigning = usages.includes("sign") || usages.includes("verify");
  const forEncryption = usages.includes("encrypt") || usages.includes("decrypt");

  if (forSigning && forEncryption) {
    throw new Error("Mixed encryption and signing usages are not supported");
  }

  const algorithm: RsaHashedImportParams = forSigning
    ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
    : { name: "RSA-OAEP", hash: "SHA-256" };

  return crypto.subtle.importKey(
    type === "public" ? "spki" : "pkcs8",
    pemToArrayBuffer(pem),
    algorithm,
    true,
    usages
  );
}

export async function encryptMessage(
  publicKey: CryptoKey,
  message: string
): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, encoded);
  return arrayBufferToBase64(encrypted);
}

export async function decryptMessage(
  privateKey: CryptoKey,
  encryptedMessage: string
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToUint8Array(encryptedMessage)
  );
  return new TextDecoder().decode(decrypted);
}

export async function signMessage(
  privateKey: CryptoKey,
  message: string
): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    privateKey,
    encoded
  );
  return arrayBufferToBase64(signature);
}

export async function verifySignature(
  publicKey: CryptoKey,
  signature: string,
  message: string
): Promise<boolean> {
  return crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    publicKey,
    base64ToUint8Array(signature),
    new TextEncoder().encode(message)
  );
}

export async function createEncryptedMessageEnvelope(
  plaintextMessage: string,
  recipientEntries: Array<{ userId: number; publicKey: CryptoKey }>
): Promise<EncryptedMessageEnvelopeV1> {
  if (!plaintextMessage.trim()) {
    throw new Error("Cannot encrypt an empty message");
  }

  const recipients: Record<string, string> = {};

  await Promise.all(
    recipientEntries.map(async ({ userId, publicKey }) => {
      recipients[String(userId)] = await encryptMessage(publicKey, plaintextMessage);
    })
  );

  return {
    version: 1,
    algorithm: "RSA-OAEP",
    recipients,
  };
}

export function getEncryptedContentForUser(
  payload: unknown,
  userId: number
): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const typedPayload = payload as Record<string, unknown>;
  const key = String(userId);

  // New envelope format
  if (
    typedPayload.version === 1 &&
    typedPayload.algorithm === "RSA-OAEP" &&
    typedPayload.recipients &&
    typeof typedPayload.recipients === "object"
  ) {
    const recipients = typedPayload.recipients as Record<string, unknown>;
    const encrypted = recipients[key];
    return typeof encrypted === "string" ? encrypted : null;
  }

  // Legacy map format
  const legacyEncrypted = typedPayload[key];
  return typeof legacyEncrypted === "string" ? legacyEncrypted : null;
}
