# usage-band Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 一個 Claude Code mod，在輸入框上方顯示 5h/7d 額度、重置倒數、token 統計和花費。

**Architecture:** 純函式 `format.ts` 負責所有數字/時間格式化（可單獨測）。`register.tsx` 監聽 `session.start` / `session.measure` / `turn.complete`，把資料寫進 `$.state` 的 atom；`ui.render`（`AbovePrompt`）讀 atom 畫出膠囊列。每 60 秒用 `$.clock.every` 更新一個 `now` atom 讓倒數重畫。

**Tech Stack:** Claude Code mod API（`claude-code`、`claude-code/testing`）、TypeScript、TSX（全域 `h`）。

**Spec:** `docs/superpowers/specs/2026-10-08-usage-band-design.md`

**Mod 資料夾（下文簡稱 `$MOD`）：** `C:\Users\michael0725\.claude\dev-mods\50fcb70b-8fab-48f6-843c-23374b1d204a\usage-band\`

## Global Constraints

- 位置：`ui.render` 的 `{ component: 'AbovePrompt' }`
- 數字縮寫：`< 1000` 原樣；`k` 一位小數；`M` 一位小數
- 時間：`≥ 1 天` → `1d 7h`；`≥ 1 小時` → `2h 40m`；`≥ 1 分` → `40m`；其餘 `<1m`
- 花費：`$` + 兩位小數；百分比：整數
- 沒資料的格子不顯示；全部沒資料 → `next(e)`；`e.props.hasSurvey` 為真 → `next(e)`
- token 範圍＝這次 session；`/clear` 後歸零
- 顏色：5h 綠、7d 紫、↑ 紅、↓ 綠、快取 藍、花費 黃
- 不做：跨對話統計、超量提醒、設定選項
- `$MOD` 不是 git repo：沒有 commit 步驟，用 `claude plugin validate` 當每個任務的收尾

## Review Focus

1. **進位邊界**：`999_950` 不能顯示成 `1000.0k`，要是 `1.0M`；`999` 顯示 `999`。→ Task 1 測試。
2. **重置時間已過**（`resetsAt` 在現在之前，或剛好等於）：顯示 `<1m`，不能出現負數。→ Task 1 測試。
3. **沒有 `resetsAt`**：只顯示 % 不顯示倒數，不能出現 `NaN`。→ Task 1 測試（`formatCountdown(undefined)` 回 `''`）。
4. **用量超過 100%**（spend limit 爆掉）：進度條填滿不溢出，% 照實顯示。→ Task 1 測試（`barCells`）。
5. **`/clear` 後 token 歸零**，但 mod 熱重載時**不能**歸零。→ Task 2 用 `startedAt` 比對處理，Task 3 手動驗證。

---

### Task 1: 骨架 + 格式化函式

**Files:**
- Create: `$MOD/.claude-plugin/plugin.json`
- Create: `$MOD/hooks/hooks.json`
- Create: `$MOD/hooks/format.ts`
- Test: `$MOD/hooks/format.test.ts`

**Interfaces:**
- Produces:
  - `formatCount(n: number): string`
  - `formatCountdown(resetsAt: string | undefined, nowMs: number): string`
  - `formatUsd(usd: number): string`
  - `barCells(percent: number, width: number): number` — 回傳要填滿幾格（0..width）

- [ ] **Step 1: 寫 manifest**

`$MOD/.claude-plugin/plugin.json`
```json
{
  "name": "usage-band",
  "version": "0.1.0",
  "description": "輸入框上方顯示 5h/7d 額度、重置倒數、token 與花費",
  "types": "./types/index.d.ts"
}
```

`$MOD/hooks/hooks.json`
```json
{ "modules": ["./register.tsx"] }
```

- [ ] **Step 2: 寫失敗的測試**

`$MOD/hooks/format.test.ts`
```ts
import { test, expect } from 'claude-code/testing'
import { formatCount, formatCountdown, formatUsd, barCells } from './format'

const NOW = Date.parse('2026-10-08T12:00:00Z')
const later = (ms: number) => new Date(NOW + ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

test('formatCount', () => {
  expect(formatCount(0)).toBe('0')
  expect(formatCount(999)).toBe('999')
  expect(formatCount(1000)).toBe('1.0k')
  expect(formatCount(15_600)).toBe('15.6k')
  expect(formatCount(954_200)).toBe('954.2k')
  expect(formatCount(999_950)).toBe('1.0M')
  expect(formatCount(1_200_000)).toBe('1.2M')
})

test('formatCountdown', () => {
  expect(formatCountdown(undefined, NOW)).toBe('')
  expect(formatCountdown('not a date', NOW)).toBe('')
  expect(formatCountdown(later(-5 * MIN), NOW)).toBe('<1m')
  expect(formatCountdown(later(0), NOW)).toBe('<1m')
  expect(formatCountdown(later(30_000), NOW)).toBe('<1m')
  expect(formatCountdown(later(40 * MIN), NOW)).toBe('40m')
  expect(formatCountdown(later(2 * HOUR + 40 * MIN), NOW)).toBe('2h 40m')
  expect(formatCountdown(later(DAY + 7 * HOUR + 59 * MIN), NOW)).toBe('1d 7h')
})

test('formatUsd', () => {
  expect(formatUsd(0)).toBe('$0.00')
  expect(formatUsd(4.321)).toBe('$4.32')
})

test('barCells', () => {
  expect(barCells(0, 8)).toBe(0)
  expect(barCells(20, 8)).toBe(2)
  expect(barCells(58, 8)).toBe(5)
  expect(barCells(100, 8)).toBe(8)
  expect(barCells(130, 8)).toBe(8)
  expect(barCells(-5, 8)).toBe(0)
})
```

- [ ] **Step 3: 跑測試，確認失敗**

Run: `claude plugin test "$MOD"`
Expected: FAIL（`./format` 找不到）

- [ ] **Step 4: 寫實作**

`$MOD/hooks/format.ts`
```ts
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

// 15600 → "15.6k"；先四捨五入到一位小數再決定單位，避免出現 "1000.0k"
export function formatCount(n: number): string {
  if (n < 1000) return String(Math.round(n))
  const k = Math.round(n / 100) / 10
  if (k < 1000) return `${k.toFixed(1)}k`
  return `${(Math.round(n / 100_000) / 10).toFixed(1)}M`
}

// 離 resetsAt 還有多久；沒時間或時間壞掉回空字串
export function formatCountdown(resetsAt: string | undefined, nowMs: number): string {
  if (!resetsAt) return ''
  const at = Date.parse(resetsAt)
  if (Number.isNaN(at)) return ''
  const left = at - nowMs
  if (left < MIN) return '<1m'
  if (left >= DAY) return `${Math.floor(left / DAY)}d ${Math.floor((left % DAY) / HOUR)}h`
  if (left >= HOUR) return `${Math.floor(left / HOUR)}h ${Math.floor((left % HOUR) / MIN)}m`
  return `${Math.floor(left / MIN)}m`
}

export function formatUsd(usd: number): string {
  return `$${usd.toFixed(2)}`
}

// 進度條要填幾格，夾在 0..width
export function barCells(percent: number, width: number): number {
  const cells = Math.round((percent / 100) * width)
  return Math.max(0, Math.min(width, cells))
}
```

- [ ] **Step 5: 跑測試，確認通過**

Run: `claude plugin test "$MOD"`
Expected: PASS（4 個 test）

---

### Task 2: 狀態 + 事件 + 畫面

**Files:**
- Create: `$MOD/types/index.d.ts`
- Create: `$MOD/hooks/register.tsx`

**Interfaces:**
- Consumes: Task 1 的 `formatCount`、`formatCountdown`、`formatUsd`、`barCells`
- Produces: `$.state['usage-band']` 的 `tokens`、`usage`、`now` 三個值

- [ ] **Step 1: 寫型別合約**

`$MOD/types/index.d.ts`
```ts
import type { SessionRateLimit } from 'claude-code'

export type Tokens = { startedAt: number; input: number; output: number; cache: number }
export type Usage = { rateLimits: SessionRateLimit[]; costUsd: number | null }

declare module 'claude-code' {
  interface PluginState {
    'usage-band': { tokens: Tokens | null; usage: Usage | null; now: number }
  }
}
```

- [ ] **Step 2: 寫 register.tsx**

`$MOD/hooks/register.tsx`
```tsx
import { atom, read, update } from 'claude-code'
import type { Register, SessionRateLimit } from 'claude-code'

import type { Tokens, Usage } from '../types'
import { barCells, formatCount, formatCountdown, formatUsd } from './format'

const tokens = atom({ plugin: 'usage-band', key: 'tokens' } as const, null)
const usage = atom({ plugin: 'usage-band', key: 'usage' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)

const BAR_WIDTH = 8

const COLORS = {
  fiveHour: { fg: '#3f7d58', bg: '#dcebe0' },
  sevenDay: { fg: '#6b4fa8', bg: '#e6def5' },
  input: { fg: '#b4483c', bg: '#f5dcd8' },
  output: { fg: '#3f7d58', bg: '#dcebe0' },
  cache: { fg: '#4a5fb0', bg: '#dde2f5' },
  cost: { fg: '#8a6a1f', bg: '#f3e7c8' },
} as const

type Tone = (typeof COLORS)[keyof typeof COLORS]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const u = await $.session.usage()
    await update($, usage, () => toUsage(u.rateLimits, u.cost?.usd))
    // /clear 會換新的 startedAt；熱重載不會，所以 token 只在換 session 時歸零
    await update($, tokens, t =>
      t && t.startedAt === u.startedAt ? t : { startedAt: u.startedAt, input: 0, output: 0, cache: 0 },
    )
    const ms = await $.clock.now()
    await update($, now, () => ms)
    $.clock.every(60_000, () => {
      void $.clock.now().then(ms => update($, now, () => ms))
    })
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    await update($, usage, () => toUsage(e.rateLimits, e.cost?.usd))
    const ms = await $.clock.now()
    await update($, now, () => ms)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const u = result.usage
    if (u) {
      await update($, tokens, t =>
        t && {
          ...t,
          input: t.input + u.input_tokens,
          output: t.output + u.output_tokens,
          cache: t.cache + u.cache_read_input_tokens + u.cache_creation_input_tokens,
        },
      )
    }
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const u = await read($, usage)
    const t = await read($, tokens)
    const nowMs = await read($, now)
    const { Box, Text } = $.ui.resolve(e)

    const pill = (key: string, tone: Tone, children: unknown) => (
      <Box key={key} backgroundColor={tone.bg} paddingX={1} marginRight={1}>
        {children}
      </Box>
    )

    const limitPill = (limit: SessionRateLimit, label: string, tone: Tone) => {
      const filled = barCells(limit.percentUsed, BAR_WIDTH)
      const countdown = formatCountdown(limit.resetsAt, nowMs)
      return pill(
        label,
        tone,
        <Text color={tone.fg}>
          {label} {'█'.repeat(filled)}
          <Text dimColor>{'░'.repeat(BAR_WIDTH - filled)}</Text>{' '}
          <Text bold>{Math.round(limit.percentUsed)}%</Text>
          {countdown ? ` │ ↻ ${countdown}` : ''}
        </Text>,
      )
    }

    const pills = []
    const five = u?.rateLimits.find(r => r.kind === 'five_hour')
    const seven = u?.rateLimits.find(r => r.kind === 'seven_day')
    if (five) pills.push(limitPill(five, '5h', COLORS.fiveHour))
    if (seven) pills.push(limitPill(seven, '7d', COLORS.sevenDay))
    if (t && t.input + t.output + t.cache > 0) {
      pills.push(pill('in', COLORS.input, <Text color={COLORS.input.fg}>↑ {formatCount(t.input)}</Text>))
      pills.push(pill('out', COLORS.output, <Text color={COLORS.output.fg}>↓ {formatCount(t.output)}</Text>))
      pills.push(pill('cache', COLORS.cache, <Text color={COLORS.cache.fg}>≋ {formatCount(t.cache)}</Text>))
    }
    if (u?.costUsd != null) {
      pills.push(pill('cost', COLORS.cost, <Text color={COLORS.cost.fg}>{formatUsd(u.costUsd)}</Text>))
    }

    if (pills.length === 0) return next(e)
    return <Box flexDirection="row" flexWrap="wrap">{pills}</Box>
  })
}

function toUsage(rateLimits: SessionRateLimit[], costUsd: number | undefined): Usage {
  return { rateLimits, costUsd: costUsd ?? null }
}
```

- [ ] **Step 3: 驗證**

Run: `claude plugin validate "$MOD"`
Expected: 沒有錯誤；列出 hooks `session.start`、`session.measure`、`turn.complete`、`ui.render`

Run: `claude plugin test "$MOD"`
Expected: PASS（Task 1 的測試仍通過）

Run（mod 載入後）: `tsc -p "$MOD"`
Expected: 沒有型別錯誤。若 `JSX` 子元素型別（`unknown` children）被拒，把 `pill` 的 `children` 型別改成 `RenderElement`（從 `claude-code` 匯入）。

---

### Task 3: 實際載入與手動驗證

**Files:** 無新增

- [ ] **Step 1:** 本回合結束時引擎詢問「Enable hot reloading for this session?」→ 使用者選 Enable。
- [ ] **Step 2:** 下一回合確認載入通知沒有錯誤；若 transcript 有 `usage-band: ui.render (AbovePrompt) refused: ...`，依原因修正。
- [ ] **Step 3:** 請使用者看輸入框上方：5h/7d 膠囊有 % 與倒數；聊過一輪後出現 ↑ ↓ ≋ 與 `$`。
- [ ] **Step 4:** 等 1 分鐘以上，倒數有變。
- [ ] **Step 5:** 修改任一檔案觸發熱重載，token 數不歸零（Review Focus #5 的後半）。
