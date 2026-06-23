export const DEFAULT_WALLET_ADDRESS = "fv-wallet-local-default";
export const DEFAULT_PUBLIC_KEY = "LOCAL_DEV_PUBLIC_KEY";
export const TEST_VAULT_SYMBOL = "TEST_VAULT";

export const FEES = {
  REGISTER_EVIDENCE: 10,
  ADD_CUSTODY_EVENT: 3,
  VERIFY_EVIDENCE: 2,
  EXPORT_REPORT: 5,
  ANCHOR_BATCH: 25,
} as const;

export type FeeType = keyof typeof FEES;

export function getFee(type: string): number {
  if (type in FEES) {
    return FEES[type as FeeType];
  }

  throw new Error(`Unknown fee type: ${type}`);
}

export function ensureSufficientBalance(balance: number, fee: number): void {
  if (balance < fee) {
    throw new Error(
      `Insufficient ${TEST_VAULT_SYMBOL} balance. Required: ${fee}, available: ${balance}.`,
    );
  }
}
