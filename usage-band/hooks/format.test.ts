import { test, expect } from 'claude-code/testing'
import { formatCount, formatCountdown, formatUsd, barCells, hasReset } from './format'

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

test('hasReset', () => {
  expect(hasReset(undefined, NOW)).toBe(false)
  expect(hasReset('not a date', NOW)).toBe(false)
  expect(hasReset(later(5 * MIN), NOW)).toBe(false)
  expect(hasReset(later(0), NOW)).toBe(true)
  expect(hasReset(later(-1), NOW)).toBe(true)
})
