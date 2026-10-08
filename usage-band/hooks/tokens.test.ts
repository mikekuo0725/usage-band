import { test, expect } from 'claude-code/testing'
import { addTurn } from './tokens'

const turn = { input_tokens: 10, output_tokens: 3, cache_read_input_tokens: 100, cache_creation_input_tokens: 5 }

test('addTurn starts from zero when nothing is stored', () => {
  expect(addTurn(null, 1, turn)).toEqual({ startedAt: 1, input: 10, output: 3, cache: 105 })
})

test('addTurn adds up within the same session', () => {
  const first = addTurn(null, 1, turn)
  expect(addTurn(first, 1, turn)).toEqual({ startedAt: 1, input: 20, output: 6, cache: 210 })
})

test('addTurn starts over after /clear (new startedAt)', () => {
  const old = { startedAt: 1, input: 999, output: 999, cache: 999 }
  expect(addTurn(old, 2, turn)).toEqual({ startedAt: 2, input: 10, output: 3, cache: 105 })
})
