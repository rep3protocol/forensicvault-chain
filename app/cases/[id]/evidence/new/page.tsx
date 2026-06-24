import Link from "next/link";
import { notFound } from "next/navigation";
import { TestnetWarning } from "@/components/TestnetWarning";
import { requirePermission } from "@/lib/auth/requirePermission";
import { FEES, TEST_VAULT_SYMBOL } from "@/lib/token/testVault";
import { prisma } from "@/lib/prisma";
import { registerEvidence } from "../actions";

type NewEvidencePageProps = {
  params: Promise<{ id: string }>;
};

const EVIDENCE_TYPES = [
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "pdf", label: "PDF" },
  { value: "audio", label: "Audio" },
  { value: "document", label: "Document" },
  { value: "screenshot", label: "Screenshot" },
  { value: "other", label: "Other" },
];

export default async function NewEvidencePage({ params }: NewEvidencePageProps) {
  const { id } = await params;
  await requirePermission("UPLOAD_EVIDENCE");

  const caseItem = await prisma.case.findUnique({
    where: { id },
  });

  if (!caseItem) {
    notFound();
  }

  const registerEvidenceForCase = registerEvidence.bind(null, id);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6">
        <Link
          href={`/cases/${id}`}
          className="text-sm text-slate-500 hover:text-slate-300"
        >
          ← Back to Case
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Upload Evidence
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Case: <span className="text-slate-200">{caseItem.title}</span>
          </p>
        </div>
        <TestnetWarning />
      </div>

      <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
        Registration fee:{" "}
        <span className="font-medium text-cyan-300">
          {FEES.REGISTER_EVIDENCE} {TEST_VAULT_SYMBOL}
        </span>
        . {TEST_VAULT_SYMBOL} is a fake local test token with no real value.
      </div>

      <p className="mb-6 text-sm leading-relaxed text-slate-400">
        Files with the same SHA-256 hash are identical in content, even if the
        file name is different. Duplicate hashes are allowed but will be flagged.
      </p>

      <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <form action={registerEvidenceForCase} className="grid gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">
              File <span className="text-red-400">*</span>
            </span>
            <input
              type="file"
              name="file"
              required
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded file:border-0 file:bg-cyan-800 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-cyan-700"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">
              Evidence Type <span className="text-red-400">*</span>
            </span>
            <select
              name="evidenceType"
              required
              defaultValue=""
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-cyan-600 focus:outline-none"
            >
              <option value="" disabled>
                Select type…
              </option>
              {EVIDENCE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-slate-400">Notes</span>
            <textarea
              name="notes"
              rows={3}
              placeholder="Optional context for this upload"
              className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-cyan-600 focus:outline-none"
            />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
            >
              Register Evidence
            </button>
            <Link
              href={`/cases/${id}`}
              className="rounded border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
