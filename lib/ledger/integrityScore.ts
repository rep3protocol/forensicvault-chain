type IntegrityScoreParams = {
  hashMatched: boolean;
  chainValid: boolean;
  custodyChainValid?: boolean;
  hasRegistrationBlock: boolean;
  hasVerification?: boolean;
};

export function calculateIntegrityScore(params: IntegrityScoreParams): number {
  let score = 100;

  if (!params.hashMatched) {
    score -= 50;
  }

  if (!params.chainValid) {
    score -= 20;
  }

  if (params.custodyChainValid === false) {
    score -= 10;
  }

  if (!params.hasRegistrationBlock) {
    score -= 10;
  }

  if (params.hasVerification === false) {
    score -= 5;
  }

  return Math.max(0, Math.min(100, score));
}
