type CustodySignatureFields = {
  publicKey: string | null;
  signature: string | null;
};

export type SignatureReadinessStatus = "PASS" | "WARNING" | "INFO";

export type SignatureReadinessResult = {
  status: SignatureReadinessStatus;
  eventCount: number;
  missingSignatureCount: number;
  placeholderPublicKeyCount: number;
  reason: string;
  action: string;
};

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

function isPlaceholderPublicKey(value: string | null | undefined) {
  if (!value || value.trim().length === 0) return false;

  const normalized = value.trim().toLowerCase();
  return (
    normalized.includes("placeholder") ||
    normalized.includes("local") ||
    normalized.includes("dev") ||
    normalized.startsWith("test_") ||
    normalized.startsWith("local_")
  );
}

export function getSignatureReadinessForEvents(
  events: CustodySignatureFields[],
): SignatureReadinessResult {
  if (events.length === 0) {
    return {
      status: "INFO",
      eventCount: 0,
      missingSignatureCount: 0,
      placeholderPublicKeyCount: 0,
      reason: "No custody events exist for signature readiness review.",
      action: "Add custody events when chain-of-custody activity occurs.",
    };
  }

  const missingSignatureCount = events.filter(
    (event) => isBlank(event.publicKey) || isBlank(event.signature),
  ).length;
  const placeholderPublicKeyCount = events.filter((event) =>
    isPlaceholderPublicKey(event.publicKey),
  ).length;

  if (missingSignatureCount > 0 || placeholderPublicKeyCount > 0) {
    return {
      status: "WARNING",
      eventCount: events.length,
      missingSignatureCount,
      placeholderPublicKeyCount,
      reason: `${missingSignatureCount} custody event(s) have missing public key/signature fields and ${placeholderPublicKeyCount} use placeholder or local public key values.`,
      action:
        "Review custody signing fields before relying on this record outside local MVP testing.",
    };
  }

  return {
    status: "PASS",
    eventCount: events.length,
    missingSignatureCount: 0,
    placeholderPublicKeyCount: 0,
    reason: "Every custody event has recorded public key and signature fields.",
    action: "Continue verifying custody hash linkage and report exports.",
  };
}
