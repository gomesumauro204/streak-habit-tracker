import type { TokenUsage } from "./types.js";

/**
 * Claude Sonnet 5 の料金(2026-08-31までの導入価格)。
 * 変更された場合はここだけ直せばよい。
 */
export const SONNET5_INPUT_USD_PER_MTOK = 2.0;
export const SONNET5_OUTPUT_USD_PER_MTOK = 10.0;

export function estimateCostUsd(usage: TokenUsage): number {
  return (
    (usage.inputTokens / 1_000_000) * SONNET5_INPUT_USD_PER_MTOK +
    (usage.outputTokens / 1_000_000) * SONNET5_OUTPUT_USD_PER_MTOK
  );
}

export function sumUsage(usages: TokenUsage[]): TokenUsage {
  return usages.reduce(
    (acc, u) => ({
      inputTokens: acc.inputTokens + u.inputTokens,
      outputTokens: acc.outputTokens + u.outputTokens,
    }),
    { inputTokens: 0, outputTokens: 0 }
  );
}
