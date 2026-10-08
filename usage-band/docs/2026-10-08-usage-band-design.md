# usage-band — 設計規格

日期：2026-10-08

## 目的

在 Claude Code 輸入框正上方放一條橫條，讓使用者一眼看到：
額度用了多少、多久後重置、這次對話用了多少 token、花了多少錢。
給使用者自己用。

## 畫面（由左到右）

| # | 格子 | 內容 | 顏色 |
|---|------|------|------|
| 1 | 5h 額度 | 圖示 · `5h` · 進度條 · `20%` · 重置倒數 `2h 40m` | 綠 |
| 2 | 7d 額度 | 圖示 · `7d` · 進度條 · `58%` · 重置倒數 `1d 7h` | 紫 |
| 3 | 送出 token | ↑ `15.6k` | 紅 |
| 4 | 收到 token | ↓ `3.0k` | 綠 |
| 5 | 快取 token | ≋ `954.2k` | 藍 |
| 6 | 花費 | $ `$4.32` | 黃 |

- 進度條：單純的條，填滿比例 = 用量 %。不加時間標記。
- 倒數：離 `resetsAt` 還有多久。

## 資料來源

| 資料 | 來源 |
|------|------|
| 5h / 7d 用量 %、重置時間 | `$.session.usage().rateLimits`，`kind` 為 `five_hour` / `seven_day` |
| 花費 | `$.session.usage().cost.usd` |
| ↑ 送出 | 每次 `turn.complete` 的 `e.usage.input_tokens` 加總 |
| ↓ 收到 | 每次 `turn.complete` 的 `e.usage.output_tokens` 加總 |
| 快取 | 每次 `turn.complete` 的 `cache_read_input_tokens + cache_creation_input_tokens` 加總 |

token 總數存在 `$.state`（mod 重新載入也不會歸零）。
範圍：這次對話（session）。`/clear` 之後重新算。

## 更新時機

- `session.measure` 事件 → 重讀額度與花費
- `turn.complete` → 加總 token
- 每 60 秒 → 重畫倒數時間（`$.clock` 計時器）

## 顯示規則

- 數字縮寫：`< 1000` 原樣；`k` 一位小數（`15.6k`）；`M` 一位小數（`1.2M`）
- 時間：`≥ 1 天` → `1d 7h`；`≥ 1 小時` → `2h 40m`；`≥ 1 分` → `40m`；其餘 `<1m`
- 花費：`$` + 兩位小數
- 百分比：整數
- 沒資料的格子不顯示（例：非訂閱帳號沒有額度、還沒聊過沒有 token）
- 全部沒資料 → 整條不顯示，交回 `next(e)`
- `e.props.hasSurvey` 為真時讓位，不顯示

## 介面差異

- 桌面版：圓角底色的小膠囊
- 終端機：彩色文字，用 `│` 分隔

實際能用的樣式依 `$.ui.resolve(e)` 給的元件為準，做不到的就退回彩色文字。

## 檔案

```
usage-band/
  .claude-plugin/plugin.json
  hooks/hooks.json
  hooks/register.tsx   ← 事件與畫面
  hooks/format.ts      ← 數字/時間/花費格式化（純函式）
  hooks/format.test.ts
  types/index.d.ts     ← $.state 的型別
```

## 測試

- `format.test.ts`：數字縮寫、倒數時間、花費的邊界值
- `claude plugin validate` + `tsc` 型別檢查
- 實際載入，看畫面

## 不做的事

- 不做今日/本週的跨對話 token 統計
- 不做警示通知（例如超過 90% 跳提醒）
- 不做可設定選項
