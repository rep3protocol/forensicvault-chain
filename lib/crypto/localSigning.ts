import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
} from "node:crypto";

export type LocalSigningKeyPair = {
  publicKeyPem: string;
  privateKeyPem: string;
};

/**
 * Local MVP only: private keys are stored in the app database for demo convenience.
 * Production should use OS keychain, hardware-backed keys, or external key management.
 */
export function generateLocalSigningKeyPair(): LocalSigningKeyPair {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  return {
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }) as string,
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
  };
}

/** Signs the custody event hash (hex string). */
export function signCustodyPayload(privateKeyPem: string, payload: string): string {
  const key = createPrivateKey(privateKeyPem);
  return sign(null, Buffer.from(payload, "utf8"), key).toString("base64");
}

/** Verifies a signature against the custody event hash (hex string). */
export function verifyCustodySignature(
  publicKeyPem: string,
  payload: string,
  signature: string,
): boolean {
  try {
    const key = createPublicKey(publicKeyPem);
    return verify(
      null,
      Buffer.from(payload, "utf8"),
      key,
      Buffer.from(signature, "base64"),
    );
  } catch {
    return false;
  }
}

export function fingerprintPublicKey(publicKeyPem: string): string {
  const key = createPublicKey(publicKeyPem);
  const der = key.export({ type: "spki", format: "der" }) as Buffer;
  return createHash("sha256").update(der).digest("hex");
}
