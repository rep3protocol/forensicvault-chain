import {
  fingerprintPublicKey,
  verifyCustodySignature,
} from "@/lib/crypto/localSigning";
import { prisma } from "@/lib/prisma";

export type CustodySignatureStatus = "PASS" | "WARNING" | "FAIL" | "INFO";

export type CustodySignatureEventFields = {
  id?: string;
  publicKey: string | null;
  signature: string | null;
  eventHash: string;
};

export type CustodyEventSignatureResult = {
  eventId: string | null;
  hasSignature: boolean;
  verified: boolean;
  fingerprint: string | null;
};

export type CustodySignatureSummary = {
  status: CustodySignatureStatus;
  totalCustodyEvents: number;
  signedEvents: number;
  verifiedEvents: number;
  failedEvents: number;
  missingSignatureEvents: number;
  message: string;
  recommendedAction: string;
  events: CustodyEventSignatureResult[];
};

const LIMITATION_MESSAGE =
  "Signature verification confirms the stored local signature matches the stored custody event hash and public key. This does not prove production-grade key custody.";

function isBlank(value: string | null | undefined) {
  return !value || value.trim().length === 0;
}

/** Verifies the stored signature against the custody event hash. */
export function verifyCustodyEventSignature(event: CustodySignatureEventFields): boolean {
  if (isBlank(event.publicKey) || isBlank(event.signature) || isBlank(event.eventHash)) {
    return false;
  }

  return verifyCustodySignature(event.publicKey!, event.eventHash, event.signature!);
}

export function summarizeCustodySignatureEvents(
  events: CustodySignatureEventFields[],
): CustodySignatureSummary {
  const eventResults: CustodyEventSignatureResult[] = events.map((event) => {
    const hasSignature = !isBlank(event.publicKey) && !isBlank(event.signature);
    const verified = hasSignature && verifyCustodyEventSignature(event);
    let fingerprint: string | null = null;

    if (!isBlank(event.publicKey)) {
      try {
        fingerprint = fingerprintPublicKey(event.publicKey!);
      } catch {
        fingerprint = null;
      }
    }

    return {
      eventId: event.id ?? null,
      hasSignature,
      verified,
      fingerprint,
    };
  });

  const totalCustodyEvents = events.length;
  const signedEvents = eventResults.filter((event) => event.hasSignature).length;
  const verifiedEvents = eventResults.filter((event) => event.verified).length;
  const missingSignatureEvents = totalCustodyEvents - signedEvents;
  const failedEvents = signedEvents - verifiedEvents;

  if (totalCustodyEvents === 0) {
    return {
      status: "INFO",
      totalCustodyEvents,
      signedEvents,
      verifiedEvents,
      failedEvents,
      missingSignatureEvents,
      message: "No custody events exist for signature verification.",
      recommendedAction: "Add custody events when chain-of-custody activity occurs.",
      events: eventResults,
    };
  }

  if (failedEvents > 0) {
    return {
      status: "FAIL",
      totalCustodyEvents,
      signedEvents,
      verifiedEvents,
      failedEvents,
      missingSignatureEvents,
      message: `${failedEvents} custody event(s) have invalid signatures. ${LIMITATION_MESSAGE}`,
      recommendedAction:
        "Review custody events with failed signature verification before relying on this record outside local MVP testing.",
      events: eventResults,
    };
  }

  if (missingSignatureEvents > 0) {
    return {
      status: "WARNING",
      totalCustodyEvents,
      signedEvents,
      verifiedEvents,
      failedEvents,
      missingSignatureEvents,
      message: `${missingSignatureEvents} legacy custody event(s) are missing local signatures. ${LIMITATION_MESSAGE}`,
      recommendedAction:
        "Legacy custody events are not auto-signed. Add new signed custody events or accept the limitation for older records.",
      events: eventResults,
    };
  }

  return {
    status: "PASS",
    totalCustodyEvents,
    signedEvents,
    verifiedEvents,
    failedEvents,
    missingSignatureEvents,
    message: `All ${verifiedEvents} custody event(s) have verified local signatures. ${LIMITATION_MESSAGE}`,
    recommendedAction: "Continue verifying custody hash linkage and report exports.",
    events: eventResults,
  };
}

export async function verifyEvidenceCustodySignatures(
  evidenceId: string,
): Promise<CustodySignatureSummary> {
  const events = await prisma.custodyEvent.findMany({
    where: { evidenceId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      publicKey: true,
      signature: true,
      eventHash: true,
    },
  });

  return summarizeCustodySignatureEvents(events);
}

export async function getCustodySignatureSummaryForEvidence(
  evidenceId: string,
): Promise<CustodySignatureSummary> {
  return verifyEvidenceCustodySignatures(evidenceId);
}

export async function getCustodySignatureSummaryForCase(
  caseId: string,
): Promise<CustodySignatureSummary> {
  const events = await prisma.custodyEvent.findMany({
    where: {
      evidence: {
        caseId,
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      publicKey: true,
      signature: true,
      eventHash: true,
    },
  });

  return summarizeCustodySignatureEvents(events);
}
