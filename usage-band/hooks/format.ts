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

// 重置時間已經過了：手上的 % 是舊的，要等下一次回話才有新數字
export function hasReset(resetsAt: string | undefined, nowMs: number): boolean {
  if (!resetsAt) return false
  const at = Date.parse(resetsAt)
  return !Number.isNaN(at) && at <= nowMs
}
