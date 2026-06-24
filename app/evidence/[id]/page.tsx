import Link from "next/link";
import { notFound } from "next/navigation";
import { TestnetWarning } from "@/components/TestnetWarning";
import { getCurrentUser } from "@/lib/auth/session";
import {
  summarizeCustodySignatureEvents,
} from "@/lib/custody/signatures";
import { getDuplicateEvidenceForItem } from "@/lib/evidence/duplicates";
import { prisma } from "@/lib/prisma";
import { FEES, TEST_VAULT_SYMBOL } from "@/lib/token/testVault";
import { addCustodyEvent } from "./actions";

function shortHash(hash?: string | null) {
  if (!hash) return "Pending";
  return hash.length > 20 ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : hash;
}

function shortFingerprint(fingerprint?: string | null) {
  if (!fingerprint) return "N/A";
  return fingerprint.length > 16
    ? `${fingerprint.slice(0, 8)}…${fingerprint.slice(-8)}`
    : fingerprint;
}

function signatureStatusClassName(status: string) {
  switch (status) {
    case "PASS":
      return "rounded bg-emerald-900/50 px-2.5 py-1 text-xs font-semibold text-emerald-300";
    case "WARNING":
      return "rounded bg-amber-900/50 px-2.5 py-1 text-xs font-semibold text-amber-300";
    case "FAIL":
      return "rounded bg-red-900/50 px-2.5 py-1 text-xs font-semibold text-red-300";
    case "INFO":
      return "rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300";
    default:
      return "rounded bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300";
  }
}

function custodyChainValid(
  registeredTxHash: string | null,
  events: { previousEventHash: string | null; eventHash: string }[]
) {
  if (events.length === 0) return true;
  if (!registeredTxHash) return false;
  if (events[0].previousEventHash !== registeredTxHash) return false;

  for (let i = 1; i < events.length; i++) {
    if (events[i].previousEventHash !== events[i - 1].eventHash) {
      return false;
    }
  }

  return true;
}

export default async function EvidenceDetailPage({
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

  const duplicateInfo = await getDuplicateEvidenceForItem(evidence.id);
  const currentUser = await getCurrentUser();
  const latestVerification = evidence.verifications[0];
  const isCustodyValid = custodyChainValid(
    evidence.registeredTxHash,
    evidence.custodyEvents
  );
  const signatureSummary = summarizeCustodySignatureEvents(evidence.custodyEvents);

  const custodyAction = addCustodyEvent.bind(null, evidence.id);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-slate-100">
      <div className="mb-8">
        <Link href={`/cases/${evidence.caseId}`} className="text-cyan-300">
          ← Back to Case
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Evidence Detail</h1>
        <p className="mt-2 text-slate-400">{evidence.originalName}</p>

        <div className="mt-4">
          <TestnetWarning />
        </div>
      </div>

      <section className="mb-8 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-lg font-semibold">Registered Evidence</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-slate-500">Case</p>
            <Link href={`/cases/${evidence.caseId}`} className="text-cyan-300">
              {evidence.case.title}
            </Link>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">Status</p>
            <p>{evidence.status}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">Type</p>
            <p>{evidence.evidenceType}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-slate-500">Registered Block</p>
            <p>{evidence.registeredBlockHeight ?? "Pending"}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase text-slate-500">SHA-256</p>
            <p className="break-all font-mono text-sm">{evidence.sha256Hash}</p>
          </div>

          <div className="md:col-span-2">
            <p className="text-xs uppercase text-slate-500">Registered Tx Hash</p>
            <p className="break-all font-mono text-sm">
              {evidence.registeredTxHash ?? "Pending"}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-lg font-semibold">Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href={`/cases/${evidence.caseId}`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            Back to Case
          </Link>
          <Link
            href={`/verify/${evidence.id}`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            Verify Evidence
          </Link>
          <Link
            href={`/reports/${evidence.id}`}
            className="rounded-lg border border-slate-700 px-4 py-2 text-center text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            Open Integrity Report
          </Link>
          <Link
            href={`/reports/${evidence.id}/download`}
            className="rounded-lg bg-emerald-500 px-4 py-2 text-center text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
          >
            Download PDF Report
          </Link>
        </div>
        <div className="mt-4 space-y-1 text-sm text-slate-400">
          <p>
            Verify Evidence costs {FEES.VERIFY_EVIDENCE} {TEST_VAULT_SYMBOL}.
          </p>
          <p>PDF report export is currently free in the local MVP.</p>
        </div>
      </section>

      {duplicateInfo && duplicateInfo.duplicates.length > 0 && (
        <section className="mb-8 rounded-xl border border-amber-500/50 bg-amber-500/10 p-6">
          <h2 className="mb-3 text-lg font-semibold text-amber-200">
            Duplicate SHA-256 Detected
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-amber-100/90">
            This evidence has the same SHA-256 hash as other registered evidence.
            This means the file content is identical, even if filenames or upload
            times differ.
          </p>

          <dl className="mb-5 grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <dt className="text-xs uppercase text-amber-200/80">
                Current SHA-256 Hash
              </dt>
              <dd className="break-all font-mono text-sm text-amber-50">
                {duplicateInfo.sha256Hash}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase text-amber-200/80">
                Duplicate Count
              </dt>
              <dd className="text-amber-50">{duplicateInfo.duplicateCount}</dd>
            </div>
          </dl>

          <div className="overflow-x-auto rounded-lg border border-amber-500/30">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-amber-500/30 bg-amber-950/30 text-amber-100">
                <tr>
                  <th className="px-4 py-3 font-medium">Original Filename</th>
                  <th className="px-4 py-3 font-medium">Case</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-500/20">
                {duplicateInfo.duplicates.map((duplicate) => (
                  <tr key={duplicate.id}>
                    <td className="px-4 py-3 text-amber-50">
                      {duplicate.originalName}
                    </td>
                    <td className="px-4 py-3 text-amber-100/80">
                      {duplicate.case.title}
                    </td>
                    <td className="px-4 py-3 text-amber-100/80">
                      {duplicate.createdAt.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/evidence/${duplicate.id}`}
                        className="text-amber-100 underline-offset-4 hover:underline"
                      >
                        Open Evidence →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mb-8 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-lg font-semibold">Latest Verification</h2>

        {latestVerification ? (
          <div>
            <p className={latestVerification.matched ? "text-green-300" : "text-red-300"}>
              {latestVerification.matched ? "MATCH" : "FAILED"} · Score{" "}
              {latestVerification.integrityScore}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Ledger chain valid: {latestVerification.chainValid ? "Yes" : "No"}
            </p>
          </div>
        ) : (
          <p className="text-slate-400">No verification recorded yet.</p>
        )}

        <Link
          href={`/verify/${evidence.id}`}
          className="mt-4 inline-block rounded-lg border border-cyan-400/50 px-4 py-2 text-sm font-semibold text-cyan-300"
        >
          Verify Evidence →
        </Link>
      </section>

      <section className="mb-8 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Custody Timeline</h2>
          <span className={isCustodyValid ? "text-green-300" : "text-red-300"}>
            {isCustodyValid ? "Custody chain valid" : "Custody chain broken"}
          </span>
        </div>

        {evidence.custodyEvents.length === 0 ? (
          <p className="text-slate-400">No custody events recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {evidence.custodyEvents.map((event, index) => {
              const signatureResult = signatureSummary.events[index];
              const isVerified = signatureResult?.verified ?? false;
              const hasSignature = signatureResult?.hasSignature ?? false;

              return (
              <div key={event.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="text-sm text-slate-500">Event {index + 1}</p>
                  <span
                    className={
                      isVerified
                        ? "text-xs font-semibold text-emerald-300"
                        : hasSignature
                          ? "text-xs font-semibold text-red-300"
                          : "text-xs font-semibold text-amber-300"
                    }
                  >
                    {isVerified
                      ? "Signature verified"
                      : hasSignature
                        ? "Signature invalid"
                        : "Signature missing"}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-cyan-200">{event.action}</h3>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <p><span className="text-slate-500">Actor:</span> {event.actorName}</p>
                  <p><span className="text-slate-500">Role:</span> {event.actorRole}</p>
                  <p><span className="text-slate-500">Previous:</span> <span className="font-mono">{shortHash(event.previousEventHash)}</span></p>
                  <p><span className="text-slate-500">Event Hash:</span> <span className="font-mono">{shortHash(event.eventHash)}</span></p>
                  <p><span className="text-slate-500">Block:</span> {event.blockHeight ?? "Pending"}</p>
                  <p><span className="text-slate-500">Tx:</span> <span className="font-mono">{shortHash(event.txHash)}</span></p>
                  <p>
                    <span className="text-slate-500">Signer Fingerprint:</span>{" "}
                    <span className="font-mono">{shortFingerprint(signatureResult?.fingerprint)}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Signature:</span>{" "}
                    <span className="font-mono">{shortHash(event.signature)}</span>
                  </p>
                  <p className="md:col-span-2"><span className="text-slate-500">Notes:</span> {event.notes || "No notes."}</p>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Signature Verification</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">
              Signature verification confirms the stored local signature matches the
              stored custody event hash and public key. This does not prove
              production-grade key custody.
            </p>
          </div>
          <span className={signatureStatusClassName(signatureSummary.status)}>
            {signatureSummary.status}
          </span>
        </div>
        <dl className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div>
            <dt className="text-xs uppercase text-slate-500">Total Events</dt>
            <dd className="mt-1 text-slate-200">{signatureSummary.totalCustodyEvents}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Signed Events</dt>
            <dd className="mt-1 text-slate-200">{signatureSummary.signedEvents}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Verified Events</dt>
            <dd className="mt-1 text-slate-200">{signatureSummary.verifiedEvents}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Missing Signatures</dt>
            <dd className="mt-1 text-slate-200">
              {signatureSummary.missingSignatureEvents}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Failed Signatures</dt>
            <dd className="mt-1 text-slate-200">{signatureSummary.failedEvents}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          {signatureSummary.message}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          {signatureSummary.recommendedAction}
        </p>
      </section>

      <section className="rounded-xl border border-slate-700 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-lg font-semibold">Add Custody Event</h2>
        <p className="mb-4 text-sm text-slate-400">
          Each custody event costs 3 TEST_VAULT. TEST_VAULT is fake, local, and has no real value.
        </p>

        <form action={custodyAction} className="grid gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Action</label>
            <select name="action" required defaultValue="COLLECTED" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2">
              <option value="REGISTERED">REGISTERED</option>
              <option value="COLLECTED">COLLECTED</option>
              <option value="TRANSFERRED">TRANSFERRED</option>
              <option value="RECEIVED">RECEIVED</option>
              <option value="ANALYZED">ANALYZED</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="EXPORTED">EXPORTED</option>
              <option value="ARCHIVED">ARCHIVED</option>
              <option value="FLAGGED">FLAGGED</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Actor Name</label>
              <input name="actorName" defaultValue={currentUser?.name ?? "Local Investigator"} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Actor Role</label>
              <input name="actorRole" defaultValue={currentUser?.role ?? "Investigator"} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">Notes</label>
            <textarea name="notes" rows={4} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
          </div>

          <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-400">
            Add Custody Event
          </button>
        </form>
      </section>
    </main>
  );
}
