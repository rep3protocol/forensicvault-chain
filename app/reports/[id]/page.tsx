import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintButton } from "@/components/PrintButton";

function formatDate(value?: Date | null) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(value);
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function custodyStatus(
  registeredTxHash: string | null,
  events: { previousEventHash: string | null; eventHash: string }[]
) {
  if (events.length === 0) return "No custody events recorded.";
  if (!registeredTxHash) return "Custody chain broken: missing registration transaction hash.";
  if (events[0].previousEventHash !== registeredTxHash) return "Custody chain broken.";

  for (let i = 1; i < events.length; i++) {
    if (events[i].previousEventHash !== events[i - 1].eventHash) {
      return "Custody chain broken.";
    }
  }

  return "Custody chain valid.";
}

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const evidence = await prisma.evidenceItem.findUnique({
    where: { id },
    include: {
      case: true,
      custodyEvents: {
        orderBy: { createdAt: "asc" },
      },
      verifications: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!evidence) notFound();

  const latestVerification = evidence.verifications[0];

  const registrationBlock =
    evidence.registeredBlockHeight !== null
      ? await prisma.ledgerBlock.findUnique({
          where: { height: evidence.registeredBlockHeight },
        })
      : null;

  const registrationTransaction =
    evidence.registeredTxHash !== null
      ? await prisma.ledgerTransaction.findUnique({
          where: { txHash: evidence.registeredTxHash },
        })
      : null;

  const generatedAt = new Date();
  const chainStatus = custodyStatus(evidence.registeredTxHash, evidence.custodyEvents);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-slate-100 print:bg-white print:text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          main { max-width: none !important; padding: 0 !important; }
          section { border: 1px solid #999 !important; background: white !important; color: black !important; }
          a { color: black !important; text-decoration: none !important; }
          .print-break { page-break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/reports" className="text-cyan-300 hover:text-cyan-200">
          ← Back to Reports
        </Link>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/reports/${evidence.id}/download`}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Download PDF Report
          </a>
          <PrintButton />
        </div>
      </div>

      <header className="mb-8 border-b border-slate-700 pb-6 print:border-black">
        <p className="text-sm uppercase tracking-widest text-slate-400 print:text-black">
          ForensicVault Chain
        </p>
        <h1 className="mt-2 text-4xl font-bold">Evidence Integrity Report</h1>

        <div className="mt-4 inline-block rounded-lg border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-300 print:border-black print:text-black">
          LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.
        </div>

        <p className="mt-4 text-sm text-slate-400 print:text-black">
          Generated: {formatDate(generatedAt)}
        </p>

        <p className="mt-4 rounded-lg border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300 print:border-black print:bg-white print:text-black">
          This report summarizes local cryptographic integrity checks, custody records, and ledger references.
          It is not a legal certification.
        </p>
      </header>

      <section className="print-break mb-6 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Case Information</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <div><dt className="text-sm text-slate-400 print:text-black">Case Title</dt><dd>{evidence.case.title}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Case ID</dt><dd className="break-all font-mono text-sm">{evidence.case.id}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Status</dt><dd>{evidence.case.status}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Jurisdiction</dt><dd>{evidence.case.jurisdiction ?? "N/A"}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Tags</dt><dd>{evidence.case.tags ?? "N/A"}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Created</dt><dd>{formatDate(evidence.case.createdAt)}</dd></div>
          <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Description</dt><dd>{evidence.case.description ?? "No description provided."}</dd></div>
        </dl>
      </section>

      <section className="print-break mb-6 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Evidence Information</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <div><dt className="text-sm text-slate-400 print:text-black">Evidence ID</dt><dd className="break-all font-mono text-sm">{evidence.id}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Original File Name</dt><dd>{evidence.originalName}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Evidence Type</dt><dd>{evidence.evidenceType}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">MIME Type</dt><dd>{evidence.mimeType ?? "N/A"}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Size Bytes</dt><dd>{evidence.sizeBytes ?? "N/A"}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Status</dt><dd>{evidence.status}</dd></div>
          <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Stored Path</dt><dd className="break-all font-mono text-sm">{evidence.storedPath ?? "N/A"}</dd></div>
          <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">SHA-256</dt><dd className="break-all font-mono text-sm">{evidence.sha256Hash}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Created</dt><dd>{formatDate(evidence.createdAt)}</dd></div>
        </dl>
      </section>

      <section className="print-break mb-6 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Registration Ledger Reference</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <div><dt className="text-sm text-slate-400 print:text-black">Registered Block Height</dt><dd>{evidence.registeredBlockHeight ?? "N/A"}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Transaction Type</dt><dd>{registrationTransaction?.type ?? "N/A"}</dd></div>
          <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Registered Transaction Hash</dt><dd className="break-all font-mono text-sm">{evidence.registeredTxHash ?? "N/A"}</dd></div>
          <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Registration Block Hash</dt><dd className="break-all font-mono text-sm">{registrationBlock?.blockHash ?? "N/A"}</dd></div>
          <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Merkle Root</dt><dd className="break-all font-mono text-sm">{registrationBlock?.merkleRoot ?? "N/A"}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Timestamp</dt><dd>{formatDate(registrationBlock?.timestamp)}</dd></div>
          <div><dt className="text-sm text-slate-400 print:text-black">Validator</dt><dd>{registrationBlock?.validator ?? "N/A"}</dd></div>
        </dl>
      </section>

      <section className="print-break mb-6 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Latest Verification</h2>

        {latestVerification ? (
          <dl className="grid gap-4 md:grid-cols-2">
            <div><dt className="text-sm text-slate-400 print:text-black">Result</dt><dd>{latestVerification.matched ? "MATCH" : "FAILED"}</dd></div>
            <div><dt className="text-sm text-slate-400 print:text-black">Integrity Score</dt><dd>{latestVerification.integrityScore}</dd></div>
            <div><dt className="text-sm text-slate-400 print:text-black">Hash Matched</dt><dd>{yesNo(latestVerification.matched)}</dd></div>
            <div><dt className="text-sm text-slate-400 print:text-black">Ledger Chain Valid</dt><dd>{yesNo(latestVerification.chainValid)}</dd></div>
            <div><dt className="text-sm text-slate-400 print:text-black">Signatures Valid</dt><dd>{yesNo(latestVerification.signaturesValid)}</dd></div>
            <div><dt className="text-sm text-slate-400 print:text-black">Verification Timestamp</dt><dd>{formatDate(latestVerification.createdAt)}</dd></div>
            <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Original Hash</dt><dd className="break-all font-mono text-sm">{latestVerification.originalHash}</dd></div>
            <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Provided Hash</dt><dd className="break-all font-mono text-sm">{latestVerification.providedHash}</dd></div>
            <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Notes</dt><dd>{latestVerification.notes ?? "N/A"}</dd></div>
          </dl>
        ) : (
          <p>No verification has been recorded for this evidence item.</p>
        )}
      </section>

      <section className="print-break mb-6 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Custody Chain</h2>
        <p>{chainStatus}</p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-2xl font-semibold">Custody Timeline</h2>

        {evidence.custodyEvents.length === 0 ? (
          <p>No custody events have been recorded.</p>
        ) : (
          <div className="space-y-4">
            {evidence.custodyEvents.map((event, index) => (
              <div key={event.id} className="print-break rounded-lg border border-slate-700 p-4 print:border-black">
                <h3 className="text-lg font-semibold">Event {index + 1}: {event.action}</h3>
                <dl className="mt-3 grid gap-3 md:grid-cols-2">
                  <div><dt className="text-sm text-slate-400 print:text-black">Actor Name</dt><dd>{event.actorName}</dd></div>
                  <div><dt className="text-sm text-slate-400 print:text-black">Actor Role</dt><dd>{event.actorRole}</dd></div>
                  <div><dt className="text-sm text-slate-400 print:text-black">Block Height</dt><dd>{event.blockHeight ?? "N/A"}</dd></div>
                  <div><dt className="text-sm text-slate-400 print:text-black">Timestamp</dt><dd>{formatDate(event.createdAt)}</dd></div>
                  <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Previous Event Hash</dt><dd className="break-all font-mono text-sm">{event.previousEventHash ?? "N/A"}</dd></div>
                  <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Event Hash</dt><dd className="break-all font-mono text-sm">{event.eventHash}</dd></div>
                  <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Transaction Hash</dt><dd className="break-all font-mono text-sm">{event.txHash ?? "N/A"}</dd></div>
                  <div className="md:col-span-2"><dt className="text-sm text-slate-400 print:text-black">Notes</dt><dd>{event.notes ?? "No notes."}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
