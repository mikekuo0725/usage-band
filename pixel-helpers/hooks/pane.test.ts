import { expect, mock, test } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

for (const surface of SURFACES) {
  test(`a spawned helper shows in the pane on ${surface}`, async ($, on) => {
    mock.clock(on, { now: 10_000 })
    on('ui.render', () => ({ type: 'Box', props: {}, children: [] }))
    on('ui.open', () => ({ value: { isPlaced: true } }))
    on('agent.spawn', () => ({ model: 'haiku', agentId: 'agent-1' }))

    const ui = await $.ui.mount({ plugin: 'pixel-helpers', surface, component: 'Pane', requestId: 'pixel-helpers', props: { bodyColumns: 60 } as never })
    const textOf = async () => (await ui.findAll({ type: 'Text' })).map(f => f.text).join('')
    expect(await textOf()).toContain('辦公室還空著')

    await $.agent.spawn({
      tool_use_id: 'tu-1',
      prompt: 'find the config',
      description: '找設定檔',
      subagentType: 'Explore',
      name: 'scout',
      provider: { plugin: 'engine', tier: 'core' },
      parentModel: 'opus',
      background: false,
      fork: false,
    })

    const text = await textOf()
    expect(text).toContain('1 位小幫手上班中')
    expect(text).toContain('scout')
    expect(text).toContain('找設定檔')
    expect(text).toContain('已工作 0 秒')
  })
}
