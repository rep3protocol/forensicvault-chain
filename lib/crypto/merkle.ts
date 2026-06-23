import { sha256String } from "@/lib/crypto/hash";

export function calculateMerkleRoot(txHashes: string[]): string {
  if (txHashes.length === 0) {
    return sha256String("");
  }

  if (txHashes.length === 1) {
    return txHashes[0];
  }

  let level = [...txHashes];

  while (level.length > 1) {
    if (level.length % 2 === 1) {
      level.push(level[level.length - 1]);
    }

    const nextLevel: string[] = [];

    for (let i = 0; i < level.length; i += 2) {
      nextLevel.push(sha256String(level[i] + level[i + 1]));
    }

    level = nextLevel;
  }

  return level[0];
}
