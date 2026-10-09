export type HelperStatus = 'running' | 'done' | 'failed'
export type Helper = {
  id: string
  name: string
  type: string
  task: string
  startedAt: number
  endedAt: number | null
  status: HelperStatus
  tools: number
}

declare module 'claude-code' {
  interface PluginState {
    'pixel-helpers': { helpers: Helper[]; now: number }
  }
}
