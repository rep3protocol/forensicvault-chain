import {
  type CustodySignatureEventFields,
  type CustodySignatureStatus,
  summarizeCustodySignatureEvents,
} from "@/lib/custody/signatures";

export type SignatureReadinessStatus = CustodySignatureStatus | "INFO";

export type SignatureReadinessResult = {
  status: SignatureReadinessStatus;
  totalCustodyEvents: number;
  signedEvents: number;
  verifiedEvents: number;
  failedEvents: number;
  missingSignatureEvents: number;
  message: string;
  recommendedAction: string;
};

export function getSignatureReadinessForEvents(
  events: CustodySignatureEventFields[],
): SignatureReadinessResult {
  const summary = summarizeCustodySignatureEvents(events);

  return {
    status: summary.status,
    totalCustodyEvents: summary.totalCustodyEvents,
    signedEvents: summary.signedEvents,
    verifiedEvents: summary.verifiedEvents,
    failedEvents: summary.failedEvents,
    missingSignatureEvents: summary.missingSignatureEvents,
    message: summary.message,
    recommendedAction: summary.recommendedAction,
  };
}
