import { expect, test } from 'claude-code/testing'

import { formatElapsed } from './format'
import { addHelper, countTool, finishHelper, ordered } from './helpers'
import { actionFor, CELL_H, CELL_W, columnsFor, drawOffice, lookFor, SIDE, toBase64, toRaster, toSvg, WALL } from './office'

const base = (id: string, startedAt: number) => ({ id, name: id, type: 'Explore', task: 'look around', startedAt })

test('helpers go out, use tools, and come back', () => {
  let list = addHelper([], base('a', 1000))
  list = addHelper(list, base('b', 2000))
  list = countTool(countTool(list, 'a'), 'a')
  expect(list.find(h => h.id === 'a')?.tools).toBe(2)

  list = finishHelper(list, 'a', 9000, false)
  list = finishHelper(list, 'b', 9500, true)
  expect(list.find(h => h.id === 'a')?.status).toBe('done')
  expect(list.find(h => h.id === 'b')?.status).toBe('failed')

  // 收工後不再加工具數
  expect(countTool(list, 'a').find(h => h.id === 'a')?.tools).toBe(2)
})

test('running helpers sort first, old finished ones fall off', () => {
  let list = addHelper([], base('run', 5000))
  for (let i = 0; i < 8; i++) {
    list = addHelper(list, base(`d${i}`, i))
    list = finishHelper(list, `d${i}`, 100 + i, false)
  }
  const shown = ordered(list)
  expect(shown[0]?.id).toBe('run')
  expect(shown[1]?.id).toBe('d7')
  expect(shown.length).toBe(7)
})

test('formatElapsed reads like a person', () => {
  expect(formatElapsed(0)).toBe('0 秒')
  expect(formatElapsed(45_400)).toBe('45 秒')
  expect(formatElapsed(65_000)).toBe('1 分 05 秒')
  expect(formatElapsed(3_725_000)).toBe('1 時 02 分')
})

test('actions stay put for 6 seconds and finished helpers stop', () => {
  const one = { id: 'x', status: 'running' as const }
  expect(actionFor(one, 0)).toBe(actionFor(one, 5))
  expect(actionFor({ id: 'x', status: 'done' }, 3)).toBe('done')
  expect(actionFor({ id: 'x', status: 'failed' }, 3)).toBe('failed')
  // 跑久了，五種動作都抽得到
  const seen = new Set(Array.from({ length: 200 }, (_, i) => actionFor(one, i * 6)))
  expect(seen.size).toBe(5)
})

test('the office fits the pane and packs for both surfaces', () => {
  expect(columnsFor(40)).toBe(1)
  expect(columnsFor(SIDE + 2 * CELL_W)).toBe(2)
  expect(columnsFor(1000)).toBe(4)
  const helper = { id: 'a', name: 'a', type: 'Explore', task: '', startedAt: 0, endedAt: null, status: 'running' as const, tools: 0 }
  const actions = ['copier', 'phone', 'coffee', 'thinking', 'done'] as const
  const desks = actions.map((action, i) => ({ helper: { ...helper, id: `h${i}` }, action, look: lookFor({ ...helper, id: `h${i}` }) }))
  const cv = drawOffice(desks, 3, 2)
  expect(cv.w).toBe(3 * CELL_W + SIDE)
  expect(cv.h).toBe(WALL + 2 * CELL_H)
  const r = toRaster(cv)
  expect(r.columns).toBe(cv.w)
  expect(r.rows).toBe(Math.ceil(cv.h / 2))
  expect(toSvg(cv).length).toBeLessThan(131072)
  expect(toBase64(new Uint8Array([77, 97, 110]))).toBe('TWFu')
  expect(toBase64(new Uint8Array([77]))).toBe('TQ==')
})
