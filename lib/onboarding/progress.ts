import { prisma } from "@/lib/prisma";

export type OnboardingStep = {
  id: string;
  label: string;
  complete: boolean;
  href: string;
};

export type OnboardingProgress = Awaited<ReturnType<typeof getOnboardingProgress>>;

export async function getOnboardingProgress() {
  const [
    caseCount,
    evidenceCount,
    verificationCount,
    custodyEventCount,
    ledgerBlockCount,
    latestCase,
    latestEvidence,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.evidenceItem.count(),
    prisma.verification.count(),
    prisma.custodyEvent.count(),
    prisma.ledgerBlock.count(),
    prisma.case.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    }),
    prisma.evidenceItem.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true, caseId: true },
    }),
  ]);

  const latestCaseHref = latestCase ? `/cases/${latestCase.id}` : "/cases";
  const latestEvidenceHref = latestEvidence ? `/evidence/${latestEvidence.id}` : "/cases";

  const steps: OnboardingStep[] = [
    {
      id: "create-case",
      label: "Create your first case",
      complete: caseCount > 0,
      href: "/cases",
    },
    {
      id: "upload-evidence",
      label: "Upload evidence",
      complete: evidenceCount > 0,
      href: latestCase ? `/cases/${latestCase.id}/evidence/new` : "/cases",
    },
    {
      id: "verify-evidence",
      label: "Verify evidence integrity",
      complete: verificationCount > 0,
      href: "/verify",
    },
    {
      id: "custody-event",
      label: "Add a custody event",
      complete: custodyEventCount > 0,
      href: latestEvidenceHref,
    },
    {
      id: "evidence-report",
      label: "Download an evidence report",
      complete: evidenceCount > 0,
      href: latestEvidence ? `/reports/${latestEvidence.id}` : "/reports",
    },
    {
      id: "case-packet",
      label: "Export a case packet",
      complete: caseCount > 0,
      href: latestCase ? `/cases/${latestCase.id}/packet` : "/cases",
    },
    {
      id: "external-anchor",
      label: "Export an external anchor",
      complete: ledgerBlockCount > 0,
      href: "/anchors",
    },
  ];

  const completedCount = steps.filter((step) => step.complete).length;
  const totalSteps = steps.length;
  const percentComplete = Math.round((completedCount / totalSteps) * 100);
  const nextIncompleteStep = steps.find((step) => !step.complete) ?? null;

  let nextAction = {
    label: "MVP workflow complete",
    href: "/",
  };

  if (caseCount === 0) {
    nextAction = { label: "Create your first case", href: "/cases" };
  } else if (evidenceCount === 0) {
    nextAction = { label: "Upload evidence", href: latestCaseHref };
  } else if (verificationCount === 0) {
    nextAction = { label: "Verify evidence", href: "/verify" };
  } else if (custodyEventCount === 0) {
    nextAction = { label: "Add custody event", href: latestEvidenceHref };
  } else if (caseCount > 0) {
    nextAction = {
      label: ledgerBlockCount > 0 ? "Export external anchor" : "Export case packet",
      href: ledgerBlockCount > 0 ? "/anchors" : latestCaseHref,
    };
  }

  const allComplete = completedCount === totalSteps;

  return {
    steps,
    completedCount,
    totalSteps,
    percentComplete,
    nextIncompleteStep,
    nextAction,
    allComplete,
    counts: {
      caseCount,
      evidenceCount,
      verificationCount,
      custodyEventCount,
      ledgerBlockCount,
    },
  };
}
