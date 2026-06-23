import { TESTNET_WARNING } from "@/lib/constants";

type TestnetWarningProps = {
  className?: string;
};

export function TestnetWarning({ className = "" }: TestnetWarningProps) {
  return (
    <div
      className={`inline-flex items-center rounded border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-medium tracking-wide text-amber-200 uppercase ${className}`}
      role="status"
    >
      {TESTNET_WARNING}
    </div>
  );
}
