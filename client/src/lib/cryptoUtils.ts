// client/src/lib/cryptoUtils.ts

// Define a custom interface for the generated key pairs
export interface AllKeyPairs {
  publicKey: CryptoKey;
  privateKey: CryptoKey; // For RSA-OAEP (encryption/decryption)
  signingPublicKey: CryptoKey;
  signingPrivateKey: CryptoKey; // For RSASSA-PKCS1-v1_5 (signing/verification)
}

/**
 * Generates an RSA public and private key pair for encryption/decryption and signing.
 * @returns A Promise that resolves to an object containing the public and private keys.
 */
export async function generateKeyPair(): Promise<AllKeyPairs> {
  // Generate an RSA key pair for encryption/decryption
  const encryptionKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true, // extractable
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"]
  );

  // Generate a separate RSA key pair for signing
  const signingKeyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5", // Algorithm for signing
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"] // Key usages for signing
  );

  return {
    publicKey: encryptionKeyPair.publicKey,
    privateKey: encryptionKeyPair.privateKey,
    signingPublicKey: signingKeyPair.publicKey,
    signingPrivateKey: signingKeyPair.privateKey,
  };
}

/**
 * Exports a CryptoKey to PEM format.
 * @param key The CryptoKey to export.
 * @returns A Promise that resolves to the PEM-encoded key string.
 */
export async function exportKeyToPem(
  key: CryptoKey,
  type: "public" | "private"
): Promise<string> {
  const exported = await crypto.subtle.exportKey(
    type === "public" ? "spki" : "pkcs8", // SPKI for public, PKCS8 for private
    key
  );
  const buffer = new Uint8Array(exported);
  const base64 = btoa(String.fromCharCode(...buffer));
  const pemHeader =
    type === "public"
      ? "-----BEGIN PUBLIC KEY-----"
      : "-----BEGIN PRIVATE KEY-----";
  const pemFooter =
    type === "public"
      ? "-----END PUBLIC KEY-----"
      : "-----END PRIVATE KEY-----";
  return `${pemHeader}\n${base64.match(/.{1,64}/g)!.join("\n")}\n${pemFooter}`;
}

/**
 * Imports a PEM-encoded key string into a CryptoKey object.
 * @param pem The PEM-encoded key string.
 * @param type 'public' or 'private' to indicate key type.
 * @param usages Array of key usages (e.g., ['encrypt'], ['decrypt'], ['sign'], ['verify']).
 * @returns A Promise that resolves to the CryptoKey object.
 */
export async function importKeyFromPem(
  pem: string,
  type: "public" | "private",
  usages: KeyUsage[] // This array is crucial for determining the algorithm
): Promise<CryptoKey> {
  try {
    console.log(`Importing ${type} key with usages:`, usages);
    
    const base64 = pem
      .replace(/(-----(BEGIN|END) (PUBLIC|PRIVATE) KEY-----|\n)/g, "")
      .trim();
    
    const buffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    console.log(`Key buffer length: ${buffer.length}`);

    let algorithm: RsaHashedKeyGenParams | RsaHashedImportParams;

    // Determine the algorithm based on the requested usages
    if (usages.includes("sign") || usages.includes("verify")) {
      algorithm = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" };
      console.log("Using RSASSA-PKCS1-v1_5 algorithm for signing/verification");
    } else if (usages.includes("encrypt") || usages.includes("decrypt")) {
      algorithm = { name: "RSA-OAEP", hash: "SHA-256" };
      console.log("Using RSA-OAEP algorithm for encryption/decryption");
    } else {
      // Fallback or throw an error if usages are unknown
      throw new Error(
        "Unknown key usages for import. Cannot determine algorithm."
      );
    }

    const key = await crypto.subtle.importKey(
      type === "public" ? "spki" : "pkcs8",
      buffer,
      algorithm, // Use the dynamically determined algorithm
      true, // extractable
      usages
    );
    
    console.log(`Successfully imported ${type} key with algorithm:`, algorithm.name);
    return key;
  } catch (error) {
    console.error(`Error importing ${type} key:`, error);
    console.error("PEM content preview:", pem.substring(0, 100) + "...");
    throw error;
  }
}

/**
 * Encrypts a message using a recipient's public key.
 * @param publicKey The recipient's public CryptoKey.
 * @param message The message string to encrypt.
 * @returns A Promise that resolves to the encrypted message (Base64 encoded string).
 */
export async function encryptMessage(
  publicKey: CryptoKey,
  message: string
): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    encoded
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted))); // Base64 encode
}

/**
 * Decrypts an encrypted message using the user's private key.
 * @param privateKey The user's private CryptoKey.
 * @param encryptedMessage The Base64 encoded encrypted message.
 * @returns A Promise that resolves to the decrypted message string.
 */
export async function decryptMessage(
  privateKey: CryptoKey,
  encryptedMessage: string
): Promise<string> {
  try {
    console.log("Decrypting message, length:", encryptedMessage.length);
    console.log("Private key algorithm:", privateKey.algorithm);
    console.log("Private key usages:", privateKey.usages);
    
    const buffer = Uint8Array.from(atob(encryptedMessage), (c) =>
      c.charCodeAt(0)
    );
    console.log("Decoded buffer length:", buffer.length);
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "RSA-OAEP",
      },
      privateKey,
      buffer
    );
    
    const result = new TextDecoder().decode(decrypted);
    console.log("Decryption successful, result length:", result.length);
    return result;
  } catch (error) {
    console.error("Decryption failed:", error);
    console.error("Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

/**
 * Signs a message using the sender's private key.
 * @param privateKey The sender's private CryptoKey for signing.
 * @param message The message string to sign.
 * @returns A Promise that resolves to the digital signature (Base64 encoded string).
 */
export async function signMessage(
  privateKey: CryptoKey,
  message: string
): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const signature = await crypto.subtle.sign(
    {
      name: "RSASSA-PKCS1-v1_5",
    },
    privateKey,
    encoded
  );
  return btoa(String.fromCharCode(...new Uint8Array(signature))); // Base64 encode
}

/**
 * Verifies a message's signature using the sender's public key.
 * @param publicKey The sender's public CryptoKey for verification.
 * @param signature The Base64 encoded digital signature.
 * @param message The original message string that was signed.
 * @returns A Promise that resolves to a boolean indicating signature validity.
 */
export async function verifySignature(
  publicKey: CryptoKey,
  signature: string,
  message: string
): Promise<boolean> {
  const encodedMessage = new TextEncoder().encode(message);
  const bufferSignature = Uint8Array.from(atob(signature), (c) =>
    c.charCodeAt(0)
  );

  return await crypto.subtle.verify(
    {
      name: "RSASSA-PKCS1-v1_5",
    },
    publicKey,
    bufferSignature,
    encodedMessage
  );
}
