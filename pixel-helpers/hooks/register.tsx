import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { formatElapsed } from './format'
import { addHelper, countTool, finishHelper, ordered } from './helpers'
import { ACTION_LABEL, actionFor, columnsFor, drawOffice, hex, lookFor, toRaster, toSvg } from './office'
import type { Desk } from './office'

const helpers = atom({ plugin: 'pixel-helpers', key: 'helpers' } as const, [])
const now = atom({ plugin: 'pixel-helpers', key: 'now' } as const, 0)

const PANE = 'pixel-helpers'
const TITLE = '小幫手'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'helpers', description: '打開小幫手面板' })
    const ms = await $.clock.now()
    await update($, now, () => ms)
    // 有人在工作時每秒走一下，時間和走路動畫才會動
    $.clock.every(1000, () => {
      void (async () => {
        const list = await read($, helpers)
        if (!list.some(x => x.status === 'running')) return
        const t = await $.clock.now()
        await update($, now, () => t)
      })()
    })
    return next(e)
  })

  on('command.run', { command: 'helpers' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: '小幫手面板打開了。' }
  })

  on('session.end', async ($, e, next) => {
    if (e.reason === 'clear') await update($, helpers, () => [])
    return next(e)
  })

  // 小幫手出發：記下名字、任務，打開面板
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)
    if (result.agentId) {
      const startedAt = await $.clock.now()
      const id = result.agentId
      await update($, helpers, list =>
        addHelper(list, {
          id,
          name: e.name ?? e.subagentType,
          type: e.subagentType,
          task: e.description || firstLine(e.prompt),
          startedAt,
        }),
      )
      await update($, now, () => startedAt)
      void $.ui.open({ id: PANE, title: TITLE })
    }
    return result
  })

  // 小幫手每用一個工具就記一筆
  on('tool.call', async ($, e, next) => {
    const id = e.agentId
    if (id) {
      const list = await read($, helpers)
      if (list.some(x => x.id === id)) await update($, helpers, l => countTool(l, id))
    }
    return next(e)
  })

  // 小幫手收工
  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    const id = e.agentId
    if (id) {
      const at = await $.clock.now()
      const failed = e.reason !== 'answer'
      await update($, helpers, list => finishHelper(list, id, at, failed))
      await update($, now, () => at)
    }
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = ordered(await read($, helpers))
    const t = await read($, now)
    const tick = Math.floor(t / 1000)
    const { Box, Text } = $.ui.resolve(e)

    const desks: Desk[] = list.map(one => ({ helper: one, action: actionFor(one, tick), look: lookFor(one) }))
    const room = e.props.bodyColumns || 80
    // 終端機一個字一個像素；桌面版一個像素畫 3px，一個字大約 7px
    const cols = columnsFor(e.surface === 'terminal' ? room - 2 : Math.floor((room * 7) / 3))
    const office = drawOffice(desks, cols, tick)

    const scene = () => {
      if (e.surface === 'terminal') {
        const { Raster } = $.ui.resolve(e)
        return <Raster key="office" {...toRaster(office)} />
      }
      const { Svg } = $.ui.resolve(e)
      return <Svg source={toSvg(office)} alt="像素辦公室：小幫手坐在辦公桌前工作" width={office.w * 3} height={office.h * 3} />
    }

    const working = list.filter(one => one.status === 'running').length
    const title = list.length === 0 ? '辦公室還空著，派小幫手出去時他們會來上班' : working > 0 ? `${working} 位小幫手上班中` : '大家都下班了'

    return (
      <Box flexDirection="column" paddingX={1}>
        <Text bold>{title}</Text>
        <Box marginTop={1}>{scene()}</Box>
        {desks.map(({ helper: one, action, look }) => {
          const ms = (one.endedAt ?? t) - one.startedAt
          const status =
            one.status === 'running'
              ? `⏱ 已工作 ${formatElapsed(ms)} · 🔧 ${one.tools} 個工具`
              : one.status === 'done'
                ? `✓ 完成，花了 ${formatElapsed(ms)} · 🔧 ${one.tools} 個工具`
                : `✗ 中斷了，做了 ${formatElapsed(ms)}`
          return (
            <Box key={one.id} flexDirection="column" marginTop={1}>
              <Text bold dimColor={one.status !== 'running'}>
                <Text color={hex(look.jacket)}>■ </Text>
                {one.name}
                <Text dimColor>{one.name === one.type ? '' : `  (${one.type})`}</Text>
                <Text>{`  ${ACTION_LABEL[action]}`}</Text>
              </Text>
              <Text dimColor={one.status !== 'running'}>{`  ${one.task}`}</Text>
              <Text color={one.status === 'running' ? 'cyan' : one.status === 'done' ? 'green' : 'red'}>{`  ${status}`}</Text>
            </Box>
          )
        })}
      </Box>
    )
  })

  // 架在 usage-band 上面：有人在工作時，輸入框上方多一行
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const below = await next(e)
    if (e.props.hasSurvey) return below
    const running = (await read($, helpers)).filter(one => one.status === 'running')
    if (running.length === 0) return below
    const { Box, Text } = $.ui.resolve(e)
    const names = running.map(one => one.name).join(' · ')
    return (
      <Box flexDirection="column">
        <Box flexDirection="row" paddingX={1}>
          <Text color="cyan" bold>{`🏃 ${running.length} 位小幫手工作中`}</Text>
          <Text dimColor>{`  ${names}  (/helpers 看詳細)`}</Text>
        </Box>
        {below ?? ''}
      </Box>
    )
  })
}

function firstLine(text: string): string {
  const line = text.split('\n').find(l => l.trim()) ?? ''
  return line.length > 60 ? `${line.slice(0, 60)}…` : line
}
