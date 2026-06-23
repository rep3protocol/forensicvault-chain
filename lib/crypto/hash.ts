import { createHash } from "node:crypto";

export function sha256Buffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function sha256String(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};

  for (const key of Object.keys(record).sort()) {
    sorted[key] = sortValue(record[key]);
  }

  return sorted;
}

export function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}
