# usage-band

My own Claude Code mods.

## usage-band

Shows your 5h / 7d usage, reset countdown, tokens and cost above the prompt box.

![usage-band](usage-band/docs/images/usage-band.png)

- **Top line**: how full the context is, plus a small chart of recent turns
- **5h / 7d**: usage % and time until it resets
- **↑ / ↓**: input / output tokens this session
- **≈**: cached tokens
- **$**: cost this session

## pixel-helpers

When you send out helpers (subagents), a pixel office opens in the side pane. Each helper sits at a desk and randomly types, talks on the phone, rushes to the copier, drinks coffee, or thinks. Finished helpers raise their arms. Interrupted helpers turn grey and fall asleep at their desk.

![pixel-helpers](pixel-helpers/docs/images/pixel-helpers.png)

- **Pane**: opens by itself when a helper starts, or with `/helpers`
- **Above the prompt**: while helpers work, a line shows how many are running and their names
- **Status**: running helpers show time worked and tools used; finished ones show the total time

## Install

```
claude plugin marketplace add mikekuo0725/usage-band
claude plugin install usage-band@usage-band
claude plugin install pixel-helpers@usage-band
```

---

# usage-band（中文）

我自己做的 Claude Code mod。

## usage-band

在輸入框上方顯示 5 小時 / 7 天額度、重置倒數、token 用量和花費。

![usage-band](usage-band/docs/images/usage-band.png)

- **第一行**：對話記憶用了多少，加上最近幾輪的小圖表
- **5h / 7d**：額度用了幾 %，還有多久重置
- **↑ / ↓**：這次對話送出 / 收到的 token
- **≈**：快取的 token
- **$**：這次對話花了多少錢

## pixel-helpers

派小幫手時，右邊面板會顯示一間像素辦公室。每位小幫手坐在自己的辦公桌前，隨機打字、講電話、衝去影印、喝咖啡或想事情。做完的小幫手會舉起雙手；被打斷的會變灰、趴在桌上睡著。

![pixel-helpers](pixel-helpers/docs/images/pixel-helpers.png)

- **面板**：小幫手出發時自動打開，或用 `/helpers` 打開
- **輸入框上方**：有小幫手在工作時，會顯示幾位在工作中和他們的名字
- **狀態**：工作中的顯示已工作時間和工具數；做完的顯示總共花多久；被中斷的顯示做了多久

## 安裝

```
claude plugin marketplace add mikekuo0725/usage-band
claude plugin install usage-band@usage-band
claude plugin install pixel-helpers@usage-band
```
