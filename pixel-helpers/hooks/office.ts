// 像素辦公室：每位小幫手一張辦公桌，右邊有影印機和咖啡機

import type { Helper } from '../types'

export type Action = 'typing' | 'phone' | 'copier' | 'coffee' | 'thinking' | 'done' | 'failed'

export const ACTION_LABEL: Record<Action, string> = {
  typing: '⌨ 打字中',
  phone: '📞 講電話',
  copier: '🏃 衝去影印',
  coffee: '☕ 喝咖啡',
  thinking: '💭 想事情',
  done: '🙌 收工',
  failed: '💤 趴著',
}

// 每 6 秒換一次動作；同一個人同一段時間永遠抽到同一個，畫面才不會亂跳
const SLOT = 6

export function actionFor(h: Pick<Helper, 'id' | 'status'>, tick: number): Action {
  if (h.status === 'done') return 'done'
  if (h.status === 'failed') return 'failed'
  const r = hash(`${h.id}:${Math.floor(tick / SLOT)}`) % 100
  if (r < 40) return 'typing'
  if (r < 60) return 'phone'
  if (r < 75) return 'copier'
  if (r < 90) return 'coffee'
  return 'thinking'
}

// ---------- 版面 ----------

export const CELL_W = 34
export const CELL_H = 34
export const WALL = 10
export const SIDE = 30

export type Look = {
  jacket: number
  hair: number
  skin: number
  tie: number
  hairStyle: 0 | 1 | 2 // 短髮、長髮、禿頭
  glasses: boolean
}

const JACKETS: Record<string, number> = {
  Explore: 0x2f6fd6,
  'general-purpose': 0xd9822b,
  Plan: 0x7a4fc4,
}
const SPARE_JACKETS = [0x2e9e6a, 0xc43d5a, 0x1f8a8a, 0x8a6a1f, 0x4a5568]
const HAIRS = [0x3b2a1a, 0x1a1a1a, 0x8a5a2b, 0xc9a04a, 0x6b3e26, 0x9a9a9a]
const SKINS = [0xf2c9a0, 0xe0ac7e, 0xc68b5e, 0x8d5a3b]
const TIES = [0xc0392b, 0x2c3e50, 0x16a085, 0x8e44ad, 0xd4ac0d]

export function lookFor(h: Pick<Helper, 'id' | 'type'>): Look {
  const n = hash(h.id)
  const style = n % 10 < 5 ? 0 : n % 10 < 8 ? 1 : 2
  return {
    jacket: Object.hasOwn(JACKETS, h.type) ? JACKETS[h.type]! : pick(SPARE_JACKETS, hash(h.type)),
    hair: pick(HAIRS, n >>> 4),
    skin: pick(SKINS, n >>> 8),
    tie: pick(TIES, n >>> 12),
    hairStyle: style,
    glasses: (n >>> 16) % 10 < 3,
  }
}

// 這麼寬的面板放得下幾張桌子一排
export function columnsFor(pixelWidth: number): number {
  return Math.max(1, Math.min(4, Math.floor((pixelWidth - SIDE) / CELL_W)))
}

// ---------- 畫布 ----------

const FLOOR = 0xe8e1d0
const TRANSPARENT = -1

export class Canvas {
  readonly w: number
  readonly h: number
  readonly px: Int32Array
  constructor(w: number, h: number) {
    this.w = w
    this.h = h
    this.px = new Int32Array(w * h).fill(FLOOR)
  }
  set(x: number, y: number, c: number) {
    if (c === TRANSPARENT || x < 0 || y < 0 || x >= this.w || y >= this.h) return
    this.px[y * this.w + x] = c
  }
  rect(x: number, y: number, w: number, h: number, c: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c)
  }
  get(x: number, y: number): number {
    return this.px[y * this.w + x] ?? FLOOR
  }
}

// ---------- 員工 ----------

// 頭：h 頭髮 H 頭髮亮面 d 頭髮暗面/眉毛 S 皮膚 s 皮膚陰影 O 眼白 E 眼珠 m 嘴巴
const HEADS: readonly (readonly string[])[] = [
  // 短髮
  [
    '...dhhhhd...',
    '..dhhHHhhd..',
    '.dhhhhhHhhd.',
    '.dhSSSSSShd.',
    '.dSddSSddSd.',
    'sSSOESSEOSSs',
    '.SSSSssSSSS.',
    '.sSSSmmSSSs.',
    '..sSSSSSSs..',
  ],
  // 長髮
  [
    '...dhhhhd...',
    '..dhhHHhhd..',
    '.dhhhhhHhhd.',
    'dhhSSSSSShhd',
    'dhSddSSddShd',
    'dhSOESSEOShd',
    'dhSSSssSSShd',
    'dhsSSmmSSshd',
    'dhhsSSSSshhd',
  ],
  // 禿頭，兩側一點頭髮
  [
    '............',
    '....sSSs....',
    '..sSSSSSSs..',
    '.dSSSSSSSSd.',
    '.dSddSSddSd.',
    'sSSOESSEOSSs',
    '.SSSSssSSSS.',
    '.sSSSmmSSSs.',
    '..sSSSSSSs..',
  ],
]

// 身體：W 白襯衫 T 領帶 t 領帶結 J 西裝 j 西裝陰影 L 翻領 G 鈕扣
const BODY = [
  '...jWWWWj...',
  'jJJLWttWLJJj',
  'JJJLWTTWLJJJ',
  'JJJJLWTWLJJJ',
  'JJJJJLTLJJJJ',
  'jJJJJJGJJJJj',
  'jJJJJJJJJJJj',
]

const LEGS_A = ['..KKKKKKKK..', '..KKK..KKK..', '..KK....KK..', '..KK....KK..', '.BBB....BBB.']
const LEGS_B = ['..KKKKKKKK..', '...KK..KK...', '...KK..KK...', '...KK..KK...', '..BBB..BBB..']

const HEAD_H = 9
const PERSON_H = HEAD_H + BODY.length

type Dot = [x: number, y: number, ch: string]

function colorOf(ch: string, look: Look, grey: boolean): number {
  const g = (c: number) => (grey ? greyOf(c) : c)
  switch (ch) {
    case 'h': return g(look.hair)
    case 'H': return g(shade(look.hair, 1.5))
    case 'd': return g(shade(look.hair, 0.65))
    case 'S': return g(look.skin)
    case 's': return g(shade(look.skin, 0.85))
    case 'O': return 0xffffff
    case 'E': return 0x2a1d14
    case 'C': return 0x3a2a20 // 瞇眼
    case 'm': return g(0xb5524a)
    case 'g': return 0x222222 // 眼鏡
    case 'W': return g(0xf7f7f7)
    case 'T': return g(look.tie)
    case 't': return g(shade(look.tie, 0.7))
    case 'J': return g(look.jacket)
    case 'j': return g(shade(look.jacket, 0.75))
    case 'L': return g(shade(look.jacket, 0.6))
    case 'G': return g(0xe5c76b)
    case 'K': return 0x2d2d3a
    case 'B': return 0x3b2414
    case 'P': return 0x1a1a1a
    case 'R': return 0xc0392b // 紅色話筒
    case 'M': return 0xffffff
    case 'V': return 0xbfc5cc
    case 'D': return 0x7fc4ff
    case 'Z': return 0x8aa0c8
    default: return TRANSPARENT
  }
}

function drawGrid(cv: Canvas, x0: number, y0: number, rows: readonly string[], look: Look, grey = false) {
  rows.forEach((row, y) => [...row].forEach((ch, x) => cv.set(x0 + x, y0 + y, colorOf(ch, look, grey))))
}

function drawDots(cv: Canvas, x0: number, y0: number, dots: Dot[], look: Look) {
  for (const [x, y, ch] of dots) cv.set(x0 + x, y0 + y, colorOf(ch, look, false))
}

function drawPerson(cv: Canvas, x: number, y: number, look: Look, grey = false, happy = false) {
  drawGrid(cv, x, y, HEADS[look.hairStyle]!, look, grey)
  drawGrid(cv, x, y + HEAD_H, BODY, look, grey)
  if (happy) drawDots(cv, x, y, [[3, 5, 'S'], [4, 5, 'C'], [3, 4, 'C'], [8, 5, 'S'], [7, 5, 'C'], [8, 4, 'C'], [5, 7, 'm'], [6, 7, 'm'], [5, 8, 'm']], look)
  if (look.glasses && !grey) {
    drawDots(cv, x, y, [[2, 5, 'g'], [5, 5, 'g'], [6, 5, 'g'], [9, 5, 'g'], [3, 6, 'g'], [4, 6, 'g'], [7, 6, 'g'], [8, 6, 'g']], look)
  }
}

// ---------- 家具 ----------

function drawRoom(cv: Canvas, cols: number) {
  // 地磚
  for (let y = WALL + 9; y < cv.h; y += 10) cv.rect(0, y, cv.w, 1, 0xddd4bf)
  for (let y = WALL; y < cv.h; y += 10) {
    const off = ((y - WALL) / 10) % 2 === 0 ? 0 : 10
    for (let x = off; x < cv.w; x += 20) cv.rect(x, y, 1, 9, 0xe1d9c6)
  }
  // 牆、窗戶、踢腳板、時鐘
  cv.rect(0, 0, cv.w, WALL, 0xc9d6e3)
  cv.rect(0, WALL - 2, cv.w, 2, 0x8a9bb0)
  for (let x = 5; x + 18 < cols * CELL_W; x += 40) {
    cv.rect(x, 1, 18, 6, 0xffffff)
    cv.rect(x + 1, 2, 7, 4, 0xa8d8f0)
    cv.rect(x + 10, 2, 7, 4, 0xa8d8f0)
    cv.set(x + 2, 2, 0xe0f4ff)
    cv.set(x + 11, 2, 0xe0f4ff)
  }
  const cx = cols * CELL_W + 12
  cv.rect(cx, 1, 6, 6, 0x555555)
  cv.rect(cx + 1, 2, 4, 4, 0xffffff)
  cv.set(cx + 2, 3, 0x222222)
  cv.set(cx + 3, 3, 0x222222)
  cv.set(cx + 2, 2, 0x222222)
}

function drawChair(cv: Canvas, cx: number, cy: number) {
  cv.rect(cx + 8, cy + 7, 14, 13, 0x3d3d48)
  cv.rect(cx + 9, cy + 8, 12, 1, 0x55556a)
}

function drawDesk(cv: Canvas, cx: number, cy: number) {
  cv.rect(cx + 2, cy + 19, 30, 2, 0x8b5a2b) // 桌面
  cv.rect(cx + 2, cy + 19, 30, 1, 0x9e6a37)
  cv.rect(cx + 2, cy + 21, 30, 7, 0xa0693a) // 前板
  cv.rect(cx + 22, cy + 23, 8, 4, 0x8b5a2b) // 抽屜
  cv.rect(cx + 25, cy + 25, 2, 1, 0xe5c76b)
  cv.rect(cx + 3, cy + 28, 2, 3, 0x6b4421)
  cv.rect(cx + 29, cy + 28, 2, 3, 0x6b4421)
  // 一疊紙、筆筒、鍵盤
  cv.rect(cx + 3, cy + 17, 5, 2, 0xffffff)
  cv.rect(cx + 3, cy + 17, 5, 1, 0xe6e6e6)
  cv.rect(cx + 9, cy + 16, 2, 3, 0x5d6d7e)
  cv.set(cx + 9, cy + 15, 0xc0392b)
  cv.set(cx + 10, cy + 14, 0x2471a3)
  cv.rect(cx + 12, cy + 19, 9, 1, 0xd0d3d4)
}

function drawMonitor(cv: Canvas, cx: number, cy: number, action: Action | 'empty', tick: number) {
  const x = cx + 22
  const y = cy + 8
  cv.rect(x, y, 11, 8, 0x2c2c2c)
  cv.rect(x + 1, y + 1, 9, 6, screenBg(action))
  cv.rect(x + 4, y + 8, 3, 2, 0x2c2c2c)
  cv.rect(x + 2, y + 10, 7, 1, 0x2c2c2c)
  if (action === 'typing') {
    // 一行一行跑的程式碼
    const colors = [0xf5b041, 0x58d68d, 0xec7063, 0xffffff]
    for (let line = 0; line < 3; line++) {
      const len = 2 + ((tick + line * 3) % 6)
      cv.rect(x + 2 + (line % 2), y + 2 + line * 2 - 1 + 1, Math.min(len, 7), 1, colors[(tick + line) % colors.length]!)
    }
  } else if (action === 'done') {
    cv.set(x + 3, y + 4, 0xffffff)
    cv.set(x + 4, y + 5, 0xffffff)
    cv.set(x + 5, y + 4, 0xffffff)
    cv.set(x + 6, y + 3, 0xffffff)
    cv.set(x + 7, y + 2, 0xffffff)
  } else if (action === 'thinking' || action === 'phone') {
    cv.rect(x + 2, y + 2, 5, 1, 0x9fc5e8)
    cv.rect(x + 2, y + 4, 3, 1, 0x9fc5e8)
  }
}

function screenBg(action: Action | 'empty'): number {
  switch (action) {
    case 'failed':
    case 'empty':
      return 0x1a1a1a
    case 'done':
      return 0x27ae60
    case 'typing':
      return 0x1e2b3a
    default:
      return 0x2e5d8a
  }
}

function drawCopier(cv: Canvas, x: number, y: number, busy: boolean, tick: number) {
  cv.rect(x, y, 18, 4, 0x8f969c)
  cv.rect(x + 1, y + 1, 10, 2, 0x5d6d7e) // 蓋子上的玻璃
  cv.rect(x, y + 4, 18, 11, 0xd5d8dc)
  cv.rect(x + 2, y + 7, 14, 1, 0xa6acaf)
  cv.rect(x + 2, y + 10, 14, 1, 0xa6acaf)
  cv.rect(x + 13, y + 1, 3, 2, 0x34495e)
  cv.set(x + 14, y + 1, busy && tick % 2 === 0 ? 0x2ecc71 : 0x1e7a46)
  if (busy) {
    cv.rect(x - 4, y + 5 + (tick % 2), 4, 3, 0xffffff) // 吐出來的紙
    cv.rect(x - 3, y + 6 + (tick % 2), 2, 1, 0xcccccc)
  }
}

function drawCoffeeMachine(cv: Canvas, x: number, y: number) {
  cv.rect(x, y, 13, 15, 0x5a3d2b)
  cv.rect(x + 1, y + 1, 11, 4, 0x3b281c)
  cv.rect(x + 2, y + 2, 4, 2, 0x85c1e9)
  cv.set(x + 9, y + 2, 0xe74c3c)
  cv.set(x + 10, y + 2, 0x2ecc71)
  cv.rect(x + 4, y + 7, 5, 1, 0x2b1d14)
  cv.rect(x + 5, y + 10, 3, 3, 0xffffff)
  cv.set(x + 8, y + 11, 0xffffff)
}

function drawPlant(cv: Canvas, x: number, y: number) {
  cv.rect(x + 2, y + 9, 7, 5, 0xb5651d)
  cv.rect(x + 2, y + 9, 7, 1, 0xca7a32)
  cv.rect(x + 1, y + 3, 9, 6, 0x3f9b4f)
  cv.rect(x + 3, y, 5, 3, 0x56b866)
  cv.set(x + 2, y + 4, 0x6fcf7f)
  cv.set(x + 7, y + 2, 0x6fcf7f)
}

// ---------- 整個場景 ----------

export type Desk = { helper: Helper; action: Action; look: Look }

export function drawOffice(desks: Desk[], cols: number, tick: number): Canvas {
  const rows = Math.max(1, Math.ceil(Math.max(desks.length, 1) / cols))
  const cv = new Canvas(cols * CELL_W + SIDE, WALL + rows * CELL_H)
  drawRoom(cv, cols)

  const copierX = cols * CELL_W + 8
  const copierY = WALL + 4
  const someoneCopying = desks.some(d => d.action === 'copier' && walkPhase(tick) === 1)
  drawCopier(cv, copierX, copierY, someoneCopying, tick)
  drawCoffeeMachine(cv, copierX + 2, copierY + 20)
  drawPlant(cv, copierX + 4, cv.h - 15)

  const walkers: { desk: Desk; cx: number; cy: number }[] = []
  for (let i = 0; i < Math.max(desks.length, cols); i++) {
    const cx = (i % cols) * CELL_W
    const cy = WALL + Math.floor(i / cols) * CELL_H
    const d = desks[i]
    if (!d) {
      drawChair(cv, cx, cy)
      drawDesk(cv, cx, cy)
      drawMonitor(cv, cx, cy, 'empty', tick)
      continue
    }
    drawChair(cv, cx, cy)
    if (d.action === 'copier') walkers.push({ desk: d, cx, cy })
    else drawSeated(cv, cx, cy, d, tick)
    drawDesk(cv, cx, cy)
    drawMonitor(cv, cx, cy, d.action, tick)
    drawHands(cv, cx, cy, d, tick)
  }
  // 走去影印的人最後畫，才會在桌子前面
  for (const { desk, cx, cy } of walkers) drawWalker(cv, cx, cy, copierX, copierY, desk, tick)
  return cv
}

const PX = 9 // 員工在格子裡的位置
const PY = 4

function drawSeated(cv: Canvas, cx: number, cy: number, d: Desk, tick: number) {
  const x = cx + PX
  const y = cy + PY
  const blink = tick % 2 === 0
  const look = d.look
  if (d.action === 'failed') {
    drawPerson(cv, x, y + 6, look, true) // 趴下去
    drawDots(cv, x, y, blink ? [[12, 0, 'Z'], [13, 0, 'Z'], [13, 1, 'Z'], [12, 2, 'Z'], [13, 2, 'Z']] : [[14, -2, 'Z'], [15, -2, 'Z'], [15, -1, 'Z'], [14, 0, 'Z'], [15, 0, 'Z']], look)
    return
  }
  drawPerson(cv, x, y, look, false, d.action === 'done')
  const dots: Dot[] = []
  switch (d.action) {
    case 'phone':
      // 左手拿話筒貼耳朵
      dots.push([0, 4, 'R'], [0, 5, 'R'], [0, 6, 'R'], [-1, 6, 'R'], [1, 4, 'R'], [-1, 7, 'S'], [-1, 8, 'S'], [-1, 9, 'J'], [-1, 10, 'J'], [0, 9, 'J'])
      if (blink) dots.push([-6, 0, 'M'], [-5, 0, 'M'], [-4, 0, 'M'], [-6, 1, 'M'], [-5, 1, 'P'], [-4, 1, 'M'], [-3, 2, 'M'])
      else dots.push([-6, 1, 'M'], [-5, 1, 'M'], [-4, 1, 'M'], [-6, 2, 'M'], [-5, 2, 'P'], [-4, 2, 'M'], [-3, 3, 'M'])
      break
    case 'coffee':
      // 端著馬克杯，杯子冒煙
      dots.push([-2, 9, 'M'], [-1, 9, 'M'], [0, 9, 'M'], [-3, 10, 'M'], [-2, 10, 'M'], [-1, 10, 'M'], [0, 10, 'M'], [-2, 11, 'M'], [-1, 11, 'M'], [0, 11, 'M'], [1, 11, 'S'], [2, 11, 'S'])
      dots.push(blink ? [-1, 7, 'V'] : [-2, 7, 'V'], blink ? [-2, 6, 'V'] : [-1, 6, 'V'], blink ? [-1, 5, 'V'] : [-2, 5, 'V'])
      break
    case 'thinking':
      // 手托下巴，頭上冒泡泡
      dots.push([5, 9, 'S'], [6, 9, 'S'], [5, 10, 'J'], [6, 10, 'J'], [12, 1, 'M'], [13, -1, 'M'])
      if (blink) dots.push([14, -4, 'M'], [15, -4, 'M'], [16, -4, 'M'], [14, -3, 'M'], [15, -3, 'M'], [16, -3, 'M'], [17, -3, 'M'], [15, -5, 'M'])
      break
    case 'done':
      // 兩手舉高
      dots.push([-1, 3, 'S'], [-1, 4, 'S'], [-1, 5, 'J'], [-1, 6, 'J'], [-1, 7, 'J'], [-1, 8, 'J'], [12, 3, 'S'], [12, 4, 'S'], [12, 5, 'J'], [12, 6, 'J'], [12, 7, 'J'], [12, 8, 'J'])
      if (blink) dots.push([-2, 2, 'S'], [13, 2, 'S'])
      break
  }
  drawDots(cv, x, y, dots, look)
}

function drawHands(cv: Canvas, cx: number, cy: number, d: Desk, tick: number) {
  if (d.action !== 'typing') return
  const skin = d.look.skin
  const up = tick % 2 === 0
  cv.rect(cx + (up ? 12 : 13), cy + 18, 2, 1, skin)
  cv.rect(cx + (up ? 19 : 18), cy + 18, 2, 1, skin)
}

// 去影印：0.33 → 0.66 → 到了 → 到了 → 0.66 → 0.33
const PHASES = [0.33, 0.66, 1, 1, 0.66, 0.33]
function walkPhase(tick: number): number {
  return PHASES[tick % SLOT] ?? 0
}

function drawWalker(cv: Canvas, cx: number, cy: number, copierX: number, copierY: number, d: Desk, tick: number) {
  const t = walkPhase(tick)
  const fromX = cx + PX
  const fromY = cy + 12
  const toX = copierX - 16
  const toY = copierY - 2
  const x = Math.round(fromX + (toX - fromX) * t)
  const y = Math.round(fromY + (toY - fromY) * t)
  const step = tick % 2 === 0
  drawPerson(cv, x, y, d.look)
  drawGrid(cv, x, y + PERSON_H, step ? LEGS_A : LEGS_B, d.look)
  // 手臂擺動
  drawDots(cv, x, y, step ? [[-1, 10, 'J'], [-1, 11, 'J'], [-1, 12, 'S'], [12, 11, 'J'], [12, 12, 'J'], [12, 13, 'S']] : [[-1, 11, 'J'], [-1, 12, 'J'], [-1, 13, 'S'], [12, 10, 'J'], [12, 11, 'J'], [12, 12, 'S']], d.look)
  if (t < 1 && step) drawDots(cv, x, y, [[13, 2, 'D'], [13, 3, 'D'], [14, 4, 'D']], d.look) // 急到流汗
}

// ---------- 輸出 ----------

const HALF_BLOCK = 0x2580

// 終端機：一格放上下兩個像素
export function toRaster(cv: Canvas): { columns: number; rows: number; cells: string } {
  const rows = Math.ceil(cv.h / 2)
  const words = new Uint32Array(cv.w * rows * 3)
  let i = 0
  for (let r = 0; r < rows; r++) {
    for (let x = 0; x < cv.w; x++) {
      words[i++] = HALF_BLOCK
      words[i++] = cv.get(x, r * 2)
      words[i++] = r * 2 + 1 < cv.h ? cv.get(x, r * 2 + 1) : cv.get(x, r * 2)
    }
  }
  return { columns: cv.w, rows, cells: toBase64(new Uint8Array(words.buffer)) }
}

// 桌面版：同顏色的橫向連續像素合成一段路徑，SVG 才不會太大
export function toSvg(cv: Canvas): string {
  const paths = new Map<number, string[]>()
  for (let y = 0; y < cv.h; y++) {
    let x = 0
    while (x < cv.w) {
      const c = cv.get(x, y)
      let end = x + 1
      while (end < cv.w && cv.get(end, y) === c) end++
      if (c !== FLOOR) {
        const list = paths.get(c) ?? []
        list.push(`M${x} ${y}h${end - x}v1h-${end - x}z`)
        paths.set(c, list)
      }
      x = end
    }
  }
  const body = [...paths].map(([c, d]) => `<path fill="${hex(c)}" d="${d.join('')}"/>`).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cv.w} ${cv.h}" shape-rendering="crispEdges">` +
    `<rect width="${cv.w}" height="${cv.h}" fill="${hex(FLOOR)}"/>${body}</svg>`
  )
}

export function hex(c: number): string {
  return `#${c.toString(16).padStart(6, '0')}`
}

// 調亮（>1）或調暗（<1）一個顏色
function shade(c: number, k: number): number {
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)))
  return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255)
}

function greyOf(c: number): number {
  const v = Math.round((((c >> 16) & 255) + ((c >> 8) & 255) + (c & 255)) / 3)
  return (v << 16) | (v << 8) | v
}

function pick<T>(list: readonly T[], n: number): T {
  return list[n % list.length]!
}

// FNV-1a
function hash(s: string): number {
  let n = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    n ^= s.charCodeAt(i)
    n = Math.imul(n, 0x01000193) >>> 0
  }
  return n
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!
    const b = bytes[i + 1]
    const c = bytes[i + 2]
    const n = (a << 16) | ((b ?? 0) << 8) | (c ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += b === undefined ? '=' : B64[(n >> 6) & 63]!
    out += c === undefined ? '=' : B64[n & 63]!
  }
  return out
}
