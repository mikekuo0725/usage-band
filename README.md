# michael-mods

My own Claude Code mods.

## usage-band

Shows your 5h / 7d usage, reset countdown, tokens and cost above the prompt box.

![usage-band](usage-band/docs/images/usage-band.png)

- **Top line**: how full the context is, plus a small chart of recent turns
- **5h / 7d**: usage % and time until it resets
- **↑ / ↓**: input / output tokens this session
- **≈**: cached tokens
- **$**: cost this session

## Install

```
claude plugin marketplace add mikekuo0725/michael-mods
claude plugin install usage-band@michael-mods
```

---

# michael-mods（中文）

我自己做的 Claude Code mod。

## usage-band

在輸入框上方顯示 5 小時 / 7 天額度、重置倒數、token 用量和花費。

![usage-band](usage-band/docs/images/usage-band.png)

- **第一行**：對話記憶用了多少，加上最近幾輪的小圖表
- **5h / 7d**：額度用了幾 %，還有多久重置
- **↑ / ↓**：這次對話送出 / 收到的 token
- **≈**：快取的 token
- **$**：這次對話花了多少錢

## 安裝

```
claude plugin marketplace add mikekuo0725/michael-mods
claude plugin install usage-band@michael-mods
```
