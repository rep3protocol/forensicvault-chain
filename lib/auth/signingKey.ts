import {
  fingerprintPublicKey,
  generateLocalSigningKeyPair,
} from "@/lib/crypto/localSigning";
import { prisma } from "@/lib/prisma";

export type UserSigningKeyInfo = {
  userId: string;
  signingPublicKey: string;
  signingPrivateKey: string;
  signingKeyFingerprint: string;
  signingKeyCreatedAt: Date;
};

/**
 * Ensures the user has a local Ed25519 signing keypair.
 * Private key material is returned for server-only signing and must not be exposed to clients.
 */
export async function ensureUserSigningKey(userId: string): Promise<UserSigningKeyInfo> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      signingPublicKey: true,
      signingPrivateKey: true,
      signingKeyFingerprint: true,
      signingKeyCreatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  if (user.signingPublicKey && user.signingPrivateKey) {
    return {
      userId: user.id,
      signingPublicKey: user.signingPublicKey,
      signingPrivateKey: user.signingPrivateKey,
      signingKeyFingerprint:
        user.signingKeyFingerprint ?? fingerprintPublicKey(user.signingPublicKey),
      signingKeyCreatedAt: user.signingKeyCreatedAt ?? new Date(),
    };
  }

  const keyPair = generateLocalSigningKeyPair();
  const signingKeyFingerprint = fingerprintPublicKey(keyPair.publicKeyPem);
  const signingKeyCreatedAt = new Date();

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      signingPublicKey: keyPair.publicKeyPem,
      signingPrivateKey: keyPair.privateKeyPem,
      signingKeyFingerprint,
      signingKeyCreatedAt,
    },
    select: {
      id: true,
      signingPublicKey: true,
      signingPrivateKey: true,
      signingKeyFingerprint: true,
      signingKeyCreatedAt: true,
    },
  });

  return {
    userId: updated.id,
    signingPublicKey: updated.signingPublicKey!,
    signingPrivateKey: updated.signingPrivateKey!,
    signingKeyFingerprint: updated.signingKeyFingerprint!,
    signingKeyCreatedAt: updated.signingKeyCreatedAt!,
  };
}
