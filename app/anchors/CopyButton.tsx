"use client";

import { useState } from "react";

type CopyButtonProps = {
  label: string;
  value: string | null | undefined;
};

export function CopyButton({ label, value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const disabled = !value;

  async function copyValue() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      disabled={disabled}
      className="rounded border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-cyan-600 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
