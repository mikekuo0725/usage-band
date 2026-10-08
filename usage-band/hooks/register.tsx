import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

import type { Usage } from '../types'
import { barCells, formatCount, formatCountdown, formatUsd, hasReset } from './format'
import { addTurn } from './tokens'
import { addReading, chart, forecastFor, trendWord } from './weather'

const tokens = atom({ plugin: 'usage-band', key: 'tokens' } as const, null)
const usage = atom({ plugin: 'usage-band', key: 'usage' } as const, null)
const now = atom({ plugin: 'usage-band', key: 'now' } as const, 0)
const readings = atom({ plugin: 'usage-band', key: 'readings' } as const, [])

const BAR_WIDTH = 8

const COLORS = {
  fiveHour: { fg: '#3f7d58', bg: '#dcebe0' },
  sevenDay: { fg: '#6b4fa8', bg: '#e6def5' },
  input: { fg: '#b4483c', bg: '#f5dcd8' },
  output: { fg: '#3f7d58', bg: '#dcebe0' },
  cache: { fg: '#4a5fb0', bg: '#dde2f5' },
  cost: { fg: '#8a6a1f', bg: '#f3e7c8' },
  stale: { fg: '#6b6b6b', bg: '#e6e6e6' },
} as const

type Tone = (typeof COLORS)[keyof typeof COLORS]

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const u = await $.session.usage()
    await update($, usage, () => toUsage(u.rateLimits, u.cost?.usd))
    const ms = await $.clock.now()
    await update($, now, () => ms)
    await takeReading($)
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

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') {
      await update($, tokens, () => null)
      await update($, readings, () => [])
    }
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const u = result.usage
    if (u) {
      // /clear 不會觸發 session.start，所以每輪都比對 startedAt 決定要不要歸零
      const { startedAt } = await $.session.usage()
      await update($, tokens, t => addTurn(t, startedAt, u))
    }
    // 記憶空間只看主對話，不看子代理
    if (!e.agentId) await takeReading($)
    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)

    const u = await read($, usage)
    const t = await read($, tokens)
    const nowMs = await read($, now)
    const list = await read($, readings)
    const { Box, Text } = $.ui.resolve(e)

    const pill = (key: string, tone: Tone, children: JSX.Element) => (
      <Box key={key} backgroundColor={tone.bg} paddingX={1} marginRight={1}>
        {children}
      </Box>
    )

    const limitPill = (limit: SessionRateLimit, label: string, tone: Tone) => {
      if (hasReset(limit.resetsAt, nowMs)) {
        const grey = COLORS.stale
        return pill(
          label,
          grey,
          <Text color={grey.fg}>
            {label} <Text dimColor>{'░'.repeat(BAR_WIDTH)}</Text> 已重置
          </Text>,
        )
      }
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

    const pills: JSX.Element[] = []
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

    const rows: JSX.Element[] = []
    const latest = list[list.length - 1]
    if (latest) {
      const f = forecastFor(latest.percent)
      const trend = trendWord(list)
      const wide = (e.props.bodyColumns ?? 80) >= 60
      rows.push(
        <Box key="weather" flexDirection="row" paddingX={1}>
          <Text color={f.color} bold>{`${f.icon}  ${f.word}`}</Text>
          <Text>{`  ${latest.percent}% of context`}</Text>
          <Text dimColor>{`  ${formatCount(latest.tokens)} / ${formatCount(latest.window)}`}</Text>
          {wide ? <Text dimColor>{'   last turns '}</Text> : ''}
          {wide ? <Text color={f.color}>{chart(list)}</Text> : ''}
          {wide && trend ? <Text dimColor>{`  ${trend}`}</Text> : ''}
        </Box>,
      )
    }
    if (pills.length > 0) {
      rows.push(<Box key="usage" flexDirection="row" flexWrap="wrap">{pills}</Box>)
    }

    // 其他 mod 畫的東西（如果有）放最上面
    const above = await next(e)
    if (rows.length === 0) return above
    return (
      <Box flexDirection="column">
        {above ?? ''}
        {rows}
      </Box>
    )
  })
}

// 讀一次記憶空間用量，加進天氣歷史
async function takeReading($: EngineInterface) {
  const { context } = await $.session.usage()
  if (!context.window) return
  const used = context.tokens ?? 0
  const percent = Math.round(context.percent ?? (used / context.window) * 100)
  await update($, readings, list => addReading(list, { tokens: used, window: context.window, percent }))
}

function toUsage(rateLimits: SessionRateLimit[], costUsd: number | undefined): Usage {
  return { rateLimits, costUsd: costUsd ?? null }
}
