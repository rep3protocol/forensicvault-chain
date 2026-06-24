import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/PrintButton";
import { requireAnyPermission } from "@/lib/auth/requirePermission";
import {
  custodyStatus,
  formatPacketDate,
  getCasePacketData,
  yesNo,
} from "@/lib/cases/packet";

type CasePacketPageProps = {
  params: Promise<{ id: string }>;
};

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 print:text-black">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-200 print:text-black">{children}</dd>
    </div>
  );
}

function MonoDetail({ label, value }: { label: string; value: unknown }) {
  return (
    <Detail label={label}>
      <span className="break-all font-mono text-xs">{String(value ?? "N/A")}</span>
    </Detail>
  );
}

export default async function CasePacketPage({ params }: CasePacketPageProps) {
  const { id } = await params;
  await requireAnyPermission(["VIEW_REPORTS", "EXPORT_CASE_PACKET"]);
  const packet = await getCasePacketData(id);

  if (!packet) {
    notFound();
  }

  const { caseItem, integritySummary, ledger } = packet;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-slate-100 print:bg-white print:text-black">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          main { max-width: none !important; padding: 0 !important; }
          section, article { border: 1px solid #999 !important; background: white !important; color: black !important; }
          a { color: black !important; text-decoration: none !important; }
          .print-break { page-break-inside: avoid; break-inside: avoid; }
        }
      `}</style>

      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href={`/cases/${caseItem.id}`} className="text-cyan-300 hover:text-cyan-200">
          Back to Case
        </Link>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/cases/${caseItem.id}/packet/download`}
            className="rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Download Case Packet PDF
          </a>
          <PrintButton />
        </div>
      </div>

      <header className="mb-8 border-b border-slate-700 pb-6 print:border-black">
        <p className="text-sm uppercase tracking-widest text-slate-400 print:text-black">
          ForensicVault Chain
        </p>
        <h1 className="mt-2 text-4xl font-bold">Case Packet</h1>
        <div className="mt-4 inline-block rounded-lg border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-300 print:border-black print:text-black">
          LOCAL TESTNET - TEST_VAULT HAS NO REAL VALUE.
        </div>
        <p className="mt-4 text-sm text-slate-400 print:text-black">
          Generated: {formatPacketDate(packet.generatedAt)}
        </p>
      </header>

      <section className="print-break mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Case Information</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <Detail label="Case Title">{caseItem.title}</Detail>
          <Detail label="Status">{caseItem.status}</Detail>
          <Detail label="Description">{caseItem.description ?? "No description provided."}</Detail>
          <Detail label="Jurisdiction">{caseItem.jurisdiction ?? "N/A"}</Detail>
          <Detail label="Tags">{caseItem.tags ?? "N/A"}</Detail>
          <MonoDetail label="Case ID" value={caseItem.id} />
          <Detail label="Created">{formatPacketDate(caseItem.createdAt)}</Detail>
          <Detail label="Updated">{formatPacketDate(caseItem.updatedAt)}</Detail>
          <Detail label="Owner">{caseItem.owner?.name ?? "N/A"}</Detail>
        </dl>
      </section>

      <section className="print-break mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Case Integrity Summary</h2>
        <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Detail label="Total Evidence Items">{integritySummary.totalEvidenceItems}</Detail>
          <Detail label="Total Duplicate Hash Groups">{integritySummary.totalDuplicateHashGroups}</Detail>
          <Detail label="Total Custody Events">{integritySummary.totalCustodyEvents}</Detail>
          <Detail label="Total Verifications">{integritySummary.totalVerifications}</Detail>
          <Detail label="Total Verification Records">
            {integritySummary.totalVerificationRecords}
          </Detail>
          <Detail label="Evidence Items With Verification">
            {integritySummary.evidenceItemsWithVerification}
          </Detail>
          <Detail label="Evidence Items Without Verification">
            {integritySummary.evidenceItemsWithoutVerification}
          </Detail>
          <Detail label="Matched Verifications">{integritySummary.matchedVerifications}</Detail>
          <Detail label="Failed/Non-Matching Verifications">{integritySummary.failedVerifications}</Detail>
          <Detail label="Custody Signature Status">
            {integritySummary.custodySignatureStatus}
          </Detail>
          <Detail label="Verified Custody Signatures">
            {integritySummary.verifiedCustodySignatures}
          </Detail>
          <Detail label="Missing Custody Signatures">
            {integritySummary.missingCustodySignatures}
          </Detail>
          <Detail label="Failed Custody Signatures">
            {integritySummary.failedCustodySignatures}
          </Detail>
          <Detail label="Latest Ledger Block Height">
            {integritySummary.latestLedgerBlockHeight ?? "N/A"}
          </Detail>
          <MonoDetail label="Latest Ledger Block Hash" value={integritySummary.latestLedgerBlockHash} />
        </dl>
      </section>

      <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Evidence Inventory</h2>
        {caseItem.evidence.length === 0 ? (
          <p className="text-sm text-slate-400 print:text-black">
            No evidence items are registered for this case.
          </p>
        ) : (
          <div className="space-y-4">
            {caseItem.evidence.map((item) => {
              const duplicateCount = packet.duplicateCounts.get(item.sha256Hash) ?? 0;
              return (
                <article key={item.id} className="print-break rounded-lg border border-slate-800 p-4">
                  <h3 className="mb-3 text-lg font-semibold">{item.originalName}</h3>
                  <dl className="grid gap-4 md:grid-cols-2">
                    <Detail label="Evidence Type">{item.evidenceType}</Detail>
                    <Detail label="MIME Type">{item.mimeType ?? "N/A"}</Detail>
                    <Detail label="Size in Bytes">{item.sizeBytes ?? "N/A"}</Detail>
                    <Detail label="Status">{item.status}</Detail>
                    <MonoDetail label="SHA-256 Hash" value={item.sha256Hash} />
                    <Detail label="Registered Block Height">{item.registeredBlockHeight ?? "N/A"}</Detail>
                    <MonoDetail label="Registered Transaction Hash" value={item.registeredTxHash} />
                    <Detail label="Created">{formatPacketDate(item.createdAt)}</Detail>
                    <Detail label="Duplicate Hash Detected">{yesNo(duplicateCount > 1)}</Detail>
                    <Detail label="Duplicate Count">{duplicateCount > 1 ? duplicateCount : 0}</Detail>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Latest Verification For Each Evidence Item</h2>
        <div className="space-y-4">
          {caseItem.evidence.map((item) => {
            const latestVerification = item.verifications[0];
            return (
              <article key={item.id} className="print-break rounded-lg border border-slate-800 p-4">
                <h3 className="mb-3 text-lg font-semibold">{item.originalName}</h3>
                {latestVerification ? (
                  <dl className="grid gap-4 md:grid-cols-2">
                    <Detail label="Latest Verification Result">
                      {latestVerification.matched ? "MATCH" : "NO MATCH"}
                    </Detail>
                    <MonoDetail label="Original Hash" value={latestVerification.originalHash} />
                    <MonoDetail label="Provided Hash" value={latestVerification.providedHash} />
                    <Detail label="Chain Valid">{yesNo(latestVerification.chainValid)}</Detail>
                    <Detail label="Signatures Valid">{yesNo(latestVerification.signaturesValid)}</Detail>
                    <Detail label="Integrity Score">{latestVerification.integrityScore}</Detail>
                    <Detail label="Verification Date">
                      {formatPacketDate(latestVerification.createdAt)}
                    </Detail>
                  </dl>
                ) : (
                  <p className="text-sm text-slate-400 print:text-black">Not verified</p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Custody Timeline For Each Evidence Item</h2>
        <div className="space-y-4">
          {caseItem.evidence.map((item) => (
            <article key={item.id} className="print-break rounded-lg border border-slate-800 p-4">
              <h3 className="mb-3 text-lg font-semibold">{item.originalName}</h3>
              <p className="mb-4 text-sm text-slate-300 print:text-black">
                {custodyStatus(item.registeredTxHash, item.custodyEvents)}
              </p>
              {item.custodyEvents.length === 0 ? (
                <p className="text-sm text-slate-400 print:text-black">
                  No custody events have been recorded.
                </p>
              ) : (
                <div className="space-y-3">
                  {item.custodyEvents.map((event, index) => (
                    <div key={event.id} className="print-break rounded border border-slate-800 p-3">
                      <h4 className="mb-3 font-semibold">
                        Event {index + 1}: {event.action}
                      </h4>
                      <dl className="grid gap-3 md:grid-cols-2">
                        <Detail label="Action">{event.action}</Detail>
                        <Detail label="Actor Name">{event.actorName}</Detail>
                        <Detail label="Actor Role">{event.actorRole}</Detail>
                        <Detail label="Notes">{event.notes ?? "No notes."}</Detail>
                        <MonoDetail label="Previous Event Hash" value={event.previousEventHash} />
                        <MonoDetail label="Event Hash" value={event.eventHash} />
                        <Detail label="Block Height">{event.blockHeight ?? "N/A"}</Detail>
                        <MonoDetail label="Transaction Hash" value={event.txHash} />
                        <Detail label="Created">{formatPacketDate(event.createdAt)}</Detail>
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section
        className={`print-break mb-6 rounded-lg border p-6 ${
          packet.duplicateGroups.length > 0
            ? "border-amber-500/50 bg-amber-500/10"
            : "border-slate-800 bg-slate-900/50"
        }`}
      >
        <h2 className="mb-4 text-xl font-semibold">Duplicate Hash Section</h2>
        {packet.duplicateGroups.length === 0 ? (
          <p className="text-sm text-slate-400 print:text-black">
            No duplicate SHA-256 hash groups were found.
          </p>
        ) : (
          <div className="space-y-4">
            {packet.duplicateGroups.map((group) => (
              <article key={group.sha256Hash} className="print-break rounded-lg border border-slate-800 p-4">
                <MonoDetail label="SHA-256 Hash" value={group.sha256Hash} />
                <div className="mt-4">
                  <Detail label="Count">{group.count}</Detail>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[42rem] text-left text-sm">
                    <thead className="border-b border-slate-800">
                      <tr>
                        <th className="py-2 pr-4 text-slate-400 print:text-black">Filename</th>
                        <th className="py-2 pr-4 text-slate-400 print:text-black">Evidence ID</th>
                        <th className="py-2 pr-4 text-slate-400 print:text-black">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.evidence.map((item) => (
                        <tr key={item.id} className="border-b border-slate-800/60">
                          <td className="py-2 pr-4">{item.originalName}</td>
                          <td className="break-all py-2 pr-4 font-mono text-xs">{item.id}</td>
                          <td className="py-2 pr-4">{formatPacketDate(item.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm text-slate-300 print:text-black">
                  Identical SHA-256 hashes indicate identical file content, even if filenames or upload
                  times differ. This is not proof of tampering by itself.
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="print-break mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h2 className="mb-4 text-xl font-semibold">Ledger References</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <Detail label="Latest Ledger Block Height">{ledger.latestLedgerBlock?.height ?? "N/A"}</Detail>
          <MonoDetail label="Latest Ledger Block Hash" value={ledger.latestLedgerBlock?.blockHash} />
          <Detail label="Total Ledger Blocks">{ledger.totalLedgerBlocks}</Detail>
          <MonoDetail label="Registration Tx Hashes" value={ledger.registrationTxHashes.join(", ") || "N/A"} />
          <MonoDetail label="Verification Tx Hashes" value={ledger.verificationTxHashes.join(", ") || "N/A"} />
          <MonoDetail label="Custody Event Tx Hashes" value={ledger.custodyTxHashes.join(", ") || "N/A"} />
          <MonoDetail
            label="Case-Related Transaction References"
            value={
              ledger.caseTransactions
                .map((transaction) => `${transaction.type}: ${transaction.txHash}`)
                .join(", ") || "N/A"
            }
          />
        </dl>
      </section>

      <footer className="border-t border-slate-800 pt-4 text-xs text-slate-500 print:border-black print:text-black">
        ForensicVault Chain local MVP/testnet. LOCAL TESTNET - TEST_VAULT HAS NO REAL VALUE.
      </footer>
    </main>
  );
}
