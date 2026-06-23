import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const ALGORITHM = "pbkdf2_sha256";
const ITERATIONS = 210_000;
const KEY_LENGTH = 32;
const DIGEST = "sha256";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${ALGORITHM}$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) return false;

  const [algorithm, iterationsValue, salt, hash] = storedHash.split("$");
  if (algorithm !== ALGORITHM || !iterationsValue || !salt || !hash) {
    return false;
  }

  const iterations = Number(iterationsValue);
  if (!Number.isInteger(iterations) || iterations < 1) {
    return false;
  }

  const expected = Buffer.from(hash, "hex");
  const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
