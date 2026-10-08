// 「記憶空間天氣」：改寫自 Anthropic 的 token-weather 範例 mod
// (Copyright 2026 Anthropic PBC, Apache-2.0)

import type { Reading } from '../types'
import { formatCount } from './format'

const HISTORY = 12
const BARS = '▁▂▃▄▅▆▇█'

// 依記憶空間用掉幾 % 決定天氣
const FORECAST = [
  { upTo: 25, icon: '☀', word: 'Clear', color: 'yellow' },
  { upTo: 50, icon: '☁', word: 'Cloudy', color: 'cyan' },
  { upTo: 75, icon: '☂', word: 'Showers', color: 'blue' },
  { upTo: 90, icon: '☇', word: 'Storm', color: 'magenta' },
  { upTo: Infinity, icon: '↯', word: 'Compact soon', color: 'red' },
] as const

export type Forecast = (typeof FORECAST)[number]

export function forecastFor(percent: number): Forecast {
  return FORECAST.find(f => percent < f.upTo) ?? FORECAST[FORECAST.length - 1]!
}

// 加一筆讀數；有真的讀數後丟掉一開始的 0，只留最後 12 筆
export function addReading(list: Reading[], next: Reading): Reading[] {
  const kept = list.filter(r => r.tokens > 0)
  return [...kept, next].slice(-HISTORY)
}

// 長條依最大那筆縮放，用多少都看得出變化
export function chart(list: Reading[]): string {
  const top = Math.max(...list.map(r => r.tokens), 1)
  return list.map(r => BARS[Math.min(BARS.length - 1, Math.floor((r.tokens / top) * (BARS.length - 1)))]).join('')
}

export function trendWord(list: Reading[]): string {
  if (list.length < 2) return ''
  const delta = list[list.length - 1]!.tokens - list[list.length - 2]!.tokens
  if (delta > 0) return `▲ +${formatCount(delta)} last turn`
  if (delta < 0) return `▼ ${formatCount(-delta)} last turn`
  return 'steady'
}
