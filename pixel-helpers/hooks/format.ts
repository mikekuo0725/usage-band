// 65000 → "1 分 05 秒"；不到一分鐘只顯示秒
export function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s} 秒`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} 分 ${String(s % 60).padStart(2, '0')} 秒`
  return `${Math.floor(m / 60)} 時 ${String(m % 60).padStart(2, '0')} 分`
}
