import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { addCustodyEvent } from "./actions";

function shortHash(hash?: string | null) {
  if (!hash) return "Pending";
  return hash.length > 20 ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : hash;
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

  const latestVerification = evidence.verifications[0];
  const isCustodyValid = custodyChainValid(
    evidence.registeredTxHash,
    evidence.custodyEvents
  );

  const custodyAction = addCustodyEvent.bind(null, evidence.id);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-slate-100">
      <div className="mb-8">
        <Link href={`/cases/${evidence.caseId}`} className="text-cyan-300">
          ← Back to Case
        </Link>

        <h1 className="mt-4 text-3xl font-bold">Evidence Detail</h1>
        <p className="mt-2 text-slate-400">{evidence.originalName}</p>

        <div className="mt-4 inline-block rounded-lg border border-amber-500/50 px-4 py-2 text-sm font-semibold text-amber-300">
          LOCAL TESTNET — TEST_VAULT HAS NO REAL VALUE.
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
            {evidence.custodyEvents.map((event, index) => (
              <div key={event.id} className="rounded-lg border border-slate-700 bg-slate-950/60 p-4">
                <p className="text-sm text-slate-500">Event {index + 1}</p>
                <h3 className="text-xl font-semibold text-cyan-200">{event.action}</h3>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <p><span className="text-slate-500">Actor:</span> {event.actorName}</p>
                  <p><span className="text-slate-500">Role:</span> {event.actorRole}</p>
                  <p><span className="text-slate-500">Previous:</span> <span className="font-mono">{shortHash(event.previousEventHash)}</span></p>
                  <p><span className="text-slate-500">Event Hash:</span> <span className="font-mono">{shortHash(event.eventHash)}</span></p>
                  <p><span className="text-slate-500">Block:</span> {event.blockHeight ?? "Pending"}</p>
                  <p><span className="text-slate-500">Tx:</span> <span className="font-mono">{shortHash(event.txHash)}</span></p>
                  <p className="md:col-span-2"><span className="text-slate-500">Notes:</span> {event.notes || "No notes."}</p>
                </div>
              </div>
            ))}
          </div>
        )}
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
              <input name="actorName" required defaultValue="Local Investigator" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Actor Role</label>
              <input name="actorRole" required defaultValue="Investigator" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2" />
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
