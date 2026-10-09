import type { Helper } from '../types'

// 做完的小幫手最多留幾位在面板上
const KEEP_DONE = 6

// 新的小幫手出發
export function addHelper(list: Helper[], h: Omit<Helper, 'endedAt' | 'status' | 'tools'>): Helper[] {
  const fresh: Helper = { ...h, endedAt: null, status: 'running', tools: 0 }
  return trim([...list.filter(x => x.id !== h.id), fresh])
}

// 小幫手用了一個工具
export function countTool(list: Helper[], id: string): Helper[] {
  return list.map(h => (h.id === id && h.status === 'running' ? { ...h, tools: h.tools + 1 } : h))
}

// 小幫手收工；failed 表示被打斷或出錯
export function finishHelper(list: Helper[], id: string, at: number, failed: boolean): Helper[] {
  return trim(
    list.map(h => (h.id === id && h.status === 'running' ? { ...h, endedAt: at, status: failed ? 'failed' : 'done' } : h)),
  )
}

// 工作中的排前面（先出發的在上），做完的排後面（最近的在上），舊的做完的丟掉
export function ordered(list: Helper[]): Helper[] {
  const running = list.filter(h => h.status === 'running').sort((a, b) => a.startedAt - b.startedAt)
  const ended = list.filter(h => h.status !== 'running').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
  return [...running, ...ended]
}

function trim(list: Helper[]): Helper[] {
  const ended = list.filter(h => h.status !== 'running').sort((a, b) => (b.endedAt ?? 0) - (a.endedAt ?? 0))
  const drop = new Set(ended.slice(KEEP_DONE).map(h => h.id))
  return list.filter(h => !drop.has(h.id))
}
