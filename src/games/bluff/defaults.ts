import type { Config } from "./types.ts";
export const READ_PRESETS = [5, 10, 20, 30] as const;
export function createDefaultConfig(selectedPackIds: string[]): Config {
  return {
    playerCount: 4,
    readSeconds: 5,
    selectedPackIds: [...selectedPackIds],
    allowHistoryQuestions: false,
  };
}
