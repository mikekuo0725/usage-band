import type { ModelUsage } from 'claude-code'

import type { Tokens } from '../types'

// 把一輪的用量加進總數；startedAt 不同代表 /clear 過，從 0 重新算
export function addTurn(t: Tokens | null, startedAt: number, u: ModelUsage): Tokens {
  const base = t && t.startedAt === startedAt ? t : { startedAt, input: 0, output: 0, cache: 0 }
  return {
    startedAt,
    input: base.input + u.input_tokens,
    output: base.output + u.output_tokens,
    cache: base.cache + u.cache_read_input_tokens + u.cache_creation_input_tokens,
  }
}
