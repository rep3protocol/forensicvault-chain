"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { OnboardingProgress } from "@/lib/onboarding/progress";

const DISMISS_KEY = "forensicvault.hideFirstRunHelper";

type FirstRunHelperProps = {
  progress: OnboardingProgress;
};

export function FirstRunHelper({ progress }: FirstRunHelperProps) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  function hideHelper() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setHidden(true);
  }

  if (hidden) return null;

  return (
    <section className="mb-10 rounded-lg border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-cyan-300 uppercase">
            Guided first run
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-100">
            Forensic workflow checklist
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {progress.completedCount} of {progress.totalSteps} steps complete ·{" "}
            {progress.percentComplete}% complete
          </p>
        </div>
        <button
          type="button"
          onClick={hideHelper}
          className="w-fit rounded border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
        >
          Hide helper on this browser
        </button>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-500"
          style={{ width: `${progress.percentComplete}%` }}
        />
      </div>

      <ol className="mt-6 grid gap-3 md:grid-cols-2">
        {progress.steps.map((step) => (
          <li
            key={step.id}
            className="flex items-start gap-3 rounded border border-slate-800 bg-slate-950/50 p-3"
          >
            <span
              className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step.complete
                  ? "bg-emerald-500 text-slate-950"
                  : "border border-slate-600 text-slate-500"
              }`}
              aria-hidden="true"
            >
              {step.complete ? "✓" : ""}
            </span>
            <div>
              <p className={step.complete ? "text-slate-200" : "text-slate-400"}>
                {step.label}
              </p>
              {!step.complete && (
                <Link href={step.href} className="text-xs text-cyan-300 hover:text-cyan-200">
                  Continue this step
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {progress.allComplete ? (
          <p className="rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">
            MVP workflow complete
          </p>
        ) : (
          <Link
            href={progress.nextAction.href}
            className="rounded bg-cyan-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-600"
          >
            {progress.nextAction.label}
          </Link>
        )}
        <Link
          href="/getting-started"
          className="rounded border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
        >
          Getting Started Guide
        </Link>
      </div>
    </section>
  );
}
