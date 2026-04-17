# Kerdos Quote Relay (Cloudflare Worker)

Kerdos（资产波动记录工具）的行情中继层。解决浏览器直连行情 API 的 CORS 问题，并提供多源降级 + KV 缓存。

> **本轮范围（W1）**：本地 dev 能跑通。生产部署延后（等域名就位）。

---

## 目录结构

```
worker/
├─ package.json
├─ wrangler.toml           # KV 命名空间 + compatibility_date
├─ tsconfig.json
├─ README.md
└─ src/
   ├─ index.ts             # 入口 / 路由 / 限流 / CORS
   ├─ cache.ts             # KV 缓存抽象（SWR 语义）
   ├─ marketHours.ts       # 开市判断（ET / CST / HKT）
   └─ providers/
      ├─ types.ts          # NormalizedPrice / SearchResult / BenchmarkSeries
      ├─ yahoo.ts          # 股票主源（含 A股 .SS/.SZ 后缀归一化）
      ├─ stooq.ts          # 股票降级源（CSV）
      ├─ coingecko.ts      # 加密货币
      └─ forex.ts          # ExchangeRate-API + Frankfurter 降级
```

---

## 本地运行

> ⚠️ 主 Claude 决定何时 `npm install`。本轮交付只写代码，不跑安装。

```bash
# 1) 安装依赖（主 Claude 批准后）
cd wealthlens/worker
npm install

# 2) 本地 dev（端口 8787）
npx wrangler dev --port 8787

# 可选：把 KV 换成真实 namespace（否则走内存兜底）
npx wrangler kv:namespace create PRICE_CACHE
npx wrangler kv:namespace create PRICE_CACHE --preview
npx wrangler kv:namespace create RATE_LIMIT
npx wrangler kv:namespace create RATE_LIMIT --preview
# 然后把返回的 id 填到 wrangler.toml
```

**KV 未配置时**：Worker 自动降级用进程内 Map，缓存和限流仍然工作，只是不跨实例共享。本地 dev 完全够用。

---

## API

所有接口都返回 JSON，带 `Access-Control-Allow-Origin: *`。

### GET `/price`

| 参数     | 类型   | 说明                                                                                   |
| -------- | ------ | -------------------------------------------------------------------------------------- |
| `type`   | enum   | `us_stock` \| `cn_stock` \| `hk_stock` \| `etf` \| `crypto` \| `forex` \| `cash` \| `gold` \| `silver` |
| `ticker` | string | 标的代码，A 股裸 6 位（600519）自动补 `.SS`，深市补 `.SZ`                              |

返回：

```json
{
  "ticker": "AAPL",
  "price": 231.42,
  "currency": "USD",
  "source": "yahoo",           // yahoo | stooq | coingecko | exchangerate | frankfurter
  "cachedAt": "2026-04-17T06:30:12.345Z",
  "asOf": "2026-04-17T06:29:58.000Z",
  "stale": false                // 所有源失败取旧值时 true
}
```

错误：`400` 参数非法 / `429` 限流 / `502` 所有源失败且无缓存兜底。

### GET `/search`

| 参数  | 类型   | 说明                                |
| ----- | ------ | ----------------------------------- |
| `type`| enum   | `stock` \| `crypto`                 |
| `q`   | string | 查询词（名字或代码）                |

返回：

```json
{
  "results": [
    { "ticker": "AAPL", "name": "Apple Inc.", "exchange": "NasdaqGS", "type": "EQUITY", "source": "yahoo" }
  ],
  "cached": false
}
```

### GET `/benchmark`

| 参数    | 类型 | 说明                               |
| ------- | ---- | ---------------------------------- |
| `id`    | enum | `sp500` \| `csi300` \| `btc`       |
| `range` | enum | `1m` \| `3m` \| `1y` \| `all`      |

返回：

```json
{
  "id": "sp500",
  "name": "sp500",
  "currency": "USD",
  "points": [{ "t": "2025-04-17T00:00:00Z", "v": 5200.23 }],
  "source": "stooq",
  "asOf": "2026-04-17T06:30:00Z",
  "cachedAt": "2026-04-17T06:30:00Z",
  "stale": false
}
```

### GET `/healthz`

健康检查，不走限流。返回 `{ ok, name, time, kv: { PRICE_CACHE, RATE_LIMIT } }`。

---

## 缓存策略（stale-while-revalidate）

| 层           | fresh TTL      | stale TTL         |
| ------------ | -------------- | ----------------- |
| 开市时段价格 | 30 秒          | +60 分钟          |
| 非开市价格   | 10 分钟        | +60 分钟          |
| 搜索结果     | 10 分钟        | +60 分钟          |
| 基准曲线     | 60 分钟        | +24 小时          |

- **fresh 命中** → 直接返回，`stale: false`
- **stale 命中** → 先回源刷新；源失败就返回旧值，`stale: true`
- **miss + 源全失败 + 有旧值** → 返回 stale 旧值（HTTP 200 + `X-Kerdos-Stale-Reason`）
- **miss + 源全失败 + 无旧值** → HTTP 502

开市判断：
- 美股 ET 周一–五 09:30–16:00（未覆盖节假日）
- A股 CST 周一–五 09:30–11:30 + 13:00–15:00
- 港股 HKT 周一–五 09:30–12:00 + 13:00–16:00
- Crypto 7x24

---

## 限流

- 默认 **60 req/min/IP**（可通过 `wrangler.toml` 的 `RATE_LIMIT_PER_MIN` 调整）
- 固定窗口算法，KV 优先、内存兜底
- 超限返回 `429` + `Retry-After` + `X-RateLimit-Reset`

---

## 降级链路

| 场景        | 主源                 | 降级 1        | 降级 2              | 最终兜底           |
| ----------- | -------------------- | ------------- | ------------------- | ------------------ |
| 美股 / ETF  | Yahoo Chart v8       | Stooq CSV     | —                   | stale KV 缓存      |
| A 股        | Yahoo（.SS/.SZ）     | Stooq（.sh/.sz）| —                 | stale KV 缓存      |
| 港股        | Yahoo（.HK）         | Stooq（.hk）  | —                   | stale KV 缓存      |
| 加密货币    | CoinGecko /simple/price | —           | —                   | stale KV 缓存      |
| 外汇        | open.er-api.com      | frankfurter.app | —                 | stale KV 缓存      |
| 贵金属      | Yahoo XAUUSD=X       | Stooq xauusd  | —                   | stale KV 缓存      |
| 基准：SP500 | Stooq ^gspc          | —             | —                   | stale KV 缓存      |
| 基准：沪深300 | Stooq 000300.sh    | —             | —                   | stale KV 缓存      |
| 基准：BTC   | CoinGecko market_chart | —           | —                   | stale KV 缓存      |

---

## 手工测试清单（10 条 curl）

> 运行前先 `npx wrangler dev --port 8787`。不要在本 README 改动之后真的跑，只是规划。

```bash
# 1. 健康检查
curl -s http://127.0.0.1:8787/healthz | jq

# 2. 美股：AAPL（首次请求走 Yahoo，再次应命中缓存）
curl -s "http://127.0.0.1:8787/price?type=us_stock&ticker=AAPL" | jq

# 3. A 股：贵州茅台（Yahoo 后缀归一化：600519 → 600519.SS）
curl -s "http://127.0.0.1:8787/price?type=cn_stock&ticker=600519" | jq

# 4. 港股：腾讯控股
curl -s "http://127.0.0.1:8787/price?type=hk_stock&ticker=0700.HK" | jq

# 5. 加密：BTC
curl -s "http://127.0.0.1:8787/price?type=crypto&ticker=BTC" | jq

# 6. 外汇：CNY → USD（主源 exchangerate，失败降级 frankfurter）
curl -s "http://127.0.0.1:8787/price?type=forex&ticker=CNY" | jq

# 7. 黄金：XAU
curl -s "http://127.0.0.1:8787/price?type=gold&ticker=XAU" | jq

# 8. 搜索：Apple（Yahoo search）
curl -s "http://127.0.0.1:8787/search?type=stock&q=apple" | jq

# 9. 基准：SP500 一年
curl -s "http://127.0.0.1:8787/benchmark?id=sp500&range=1y" | jq

# 10. 限流触发（快速连打 70 次，第 61+ 应返回 429）
for i in {1..70}; do
  curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:8787/price?type=us_stock&ticker=AAPL"
done | sort | uniq -c
# 预期：60 x 200，10 x 429
```

**降级触发演练**（可选）：
- 临时断网或把 `yahoo.ts` 的 CHART_BASE 改成错误域名 → 美股请求应自动走 Stooq
- 连续两次请求相同 ticker，第二次 `source` 不变但会快返（命中 fresh 缓存）

---

## 生产部署待办（延后）

- [ ] 购买 / 复用域名，绑定 Worker route（例如 `quote.kerdos.app/*`）
- [ ] `wrangler kv:namespace create PRICE_CACHE` / `RATE_LIMIT` 并把真实 id 写回 `wrangler.toml`
- [ ] 前端（`wealthlens/src/services/priceService.ts`）切换到从此 Worker 拉数据 —— 由另一个任务负责
- [ ] 考虑付费源（Alpha Vantage 付费版 / Polygon）替代 Yahoo 非官方端点，降低封禁风险
- [ ] 加 cron trigger 预热热门标的（BTC / AAPL / SPY / 600519 / 沪深300）
- [ ] Sentry 或 Cloudflare Logpush 接入，监控 stale 响应比例
- [ ] 对 `/search` 做更严格的限流（容易被滥用）

---

## 已知局限

1. **开市判断不含节假日**。美股圣诞节、A 股春节等非交易日会被误判为开市，导致 fresh TTL 仍是 30s。影响可控（最多多打几次源），但生产前建议接入节假日日历。
2. **Yahoo 非官方端点**。`query1.finance.yahoo.com` 没有 SLA，长期有被限速风险。Stooq 作为降级已经覆盖主流标的，但数据延迟和字段完整性不如 Yahoo。
3. **Worker 内存 Map 兜底不跨实例**。Cloudflare 会把 Worker 部署到多 region，如果没配 KV，不同 region 的限流计数互相独立，实际限流会被放宽 N 倍。本地 dev 单实例无此问题。
4. **CoinGecko 免费版 30 req/min**。我们缓存 30s fresh，正常使用不会触发，但如果用户 ticker 数量多且集中在非开市时段同时刷新，可能命中上游限速。需要时升级到 API Key 版本。
5. **Zod 包大小**。Zod 体积约 60KB，如果后续对 Worker 启动时间敏感，可以换成手写校验。本阶段先重可读性。
