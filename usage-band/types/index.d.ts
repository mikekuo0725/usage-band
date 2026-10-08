export type RateLimit = { kind: string; percentUsed: number; resetsAt?: string }
export type Tokens = { startedAt: number; input: number; output: number; cache: number }
export type Usage = { rateLimits: RateLimit[]; costUsd: number | null }
export type Reading = { tokens: number; window: number; percent: number }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { tokens: Tokens | null; usage: Usage | null; now: number; readings: Reading[] }
  }
}
