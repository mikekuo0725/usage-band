import { test, expect } from 'claude-code/testing'
import { addReading, chart, forecastFor, trendWord } from './weather'

const r = (tokens: number) => ({ tokens, window: 200_000, percent: Math.round((tokens / 200_000) * 100) })

test('forecastFor picks the band by percent', () => {
  expect(forecastFor(0).word).toBe('Clear')
  expect(forecastFor(25).word).toBe('Cloudy')
  expect(forecastFor(60).word).toBe('Showers')
  expect(forecastFor(89).word).toBe('Storm')
  expect(forecastFor(95).word).toBe('Compact soon')
})

test('addReading drops the empty first reading and keeps the last 12', () => {
  let list = addReading([], r(0))
  expect(list).toEqual([r(0)])
  list = addReading(list, r(1000))
  expect(list).toEqual([r(1000)])
  for (let i = 2; i <= 20; i++) list = addReading(list, r(i * 1000))
  expect(list.length).toBe(12)
  expect(list[11]).toEqual(r(20_000))
})

test('chart scales to the busiest reading', () => {
  expect(chart([r(0), r(50_000), r(100_000)])).toBe('▁▄█')
  expect(chart([])).toBe('')
})

test('trendWord compares the last two readings', () => {
  expect(trendWord([r(1000)])).toBe('')
  expect(trendWord([r(1000), r(3500)])).toBe('▲ +2.5k last turn')
  expect(trendWord([r(3500), r(1000)])).toBe('▼ 2.5k last turn')
  expect(trendWord([r(1000), r(1000)])).toBe('steady')
})
