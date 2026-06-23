import { sha256String, stableJson } from "@/lib/crypto/hash";

export function calculateTransactionHash(
  type: string,
  payloadJson: string,
  signerPublicKey?: string,
): string {
  return sha256String(
    stableJson({
      type,
      payload: JSON.parse(payloadJson) as unknown,
      signerPublicKey: signerPublicKey ?? null,
    }),
  );
}

export function calculateBlockHash(
  height: number,
  timestamp: string,
  previousHash: string,
  merkleRoot: string,
  validator: string,
): string {
  return sha256String(
    stableJson({
      height,
      timestamp,
      previousHash,
      merkleRoot,
      validator,
    }),
  );
}
