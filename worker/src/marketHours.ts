/**
 * 开市判断 —— 决定缓存 TTL（开市 30s / 非开市 10 min）。
 *
 * 设计取舍：
 * - 不做精确节假日日历（太重）。只判断 星期 + 时区时段。
 * - US: 周一到周五 09:30–16:00 ET
 * - CN (A股): 周一到周五 09:30–11:30 + 13:00–15:00 CST(UTC+8)
 * - HK: 周一到周五 09:30–12:00 + 13:00–16:00 HKT(UTC+8)
 * - Crypto / Forex / Metals: 视为 7x24 开市（forex 周末 UTC Sat/Sun 实际收盘，但对缓存 TTL 影响小，暂从简）
 *
 * 精确节假日 / 早闭市日未覆盖 —— 见 README 的"已知局限"。
 */

export type MarketCategory =
  | 'us_stock'
  | 'cn_stock'
  | 'hk_stock'
  | 'etf' // ETF 默认按 us_stock 处理，中概 ETF 在 .SS/.SZ 后缀判断
  | 'crypto'
  | 'forex'
  | 'gold'
  | 'silver'
  | 'cash'
  | 'unknown';

/**
 * 根据 ticker 后缀推断市场类别。
 * - AAPL, SPY → us_stock
 * - 600519.SS, 000001.SZ → cn_stock
 * - 0700.HK → hk_stock
 */
export function inferMarketFromTicker(
  declaredType: string,
  ticker: string,
): MarketCategory {
  const t = ticker.toUpperCase();
  if (t.endsWith('.SS') || t.endsWith('.SZ') || t.endsWith('.SH')) return 'cn_stock';
  if (t.endsWith('.HK')) return 'hk_stock';

  switch (declaredType) {
    case 'us_stock':
    case 'cn_stock':
    case 'hk_stock':
    case 'etf':
    case 'crypto':
    case 'forex':
    case 'gold':
    case 'silver':
    case 'cash':
      return declaredType as MarketCategory;
    default:
      return 'unknown';
  }
}

/**
 * 把 UTC 时间投影到指定 IANA 时区，返回该时区下的 { weekday(0-6, Sun=0), hour, minute }。
 * 使用 Intl.DateTimeFormat（Workers runtime 支持）。
 */
function toZoned(now: Date, timeZone: string): { weekday: number; hour: number; minute: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');

  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return { weekday: weekdayMap[weekdayStr] ?? 1, hour: hour === 24 ? 0 : hour, minute };
}

function isWithin(
  hour: number,
  minute: number,
  startH: number,
  startM: number,
  endH: number,
  endM: number,
): boolean {
  const t = hour * 60 + minute;
  const s = startH * 60 + startM;
  const e = endH * 60 + endM;
  return t >= s && t < e;
}

/**
 * 判断当前是否开市。now 默认为当前时间（便于测试注入）。
 */
export function isMarketOpen(category: MarketCategory, now: Date = new Date()): boolean {
  switch (category) {
    case 'crypto':
      return true; // 7x24

    case 'us_stock':
    case 'etf': {
      const { weekday, hour, minute } = toZoned(now, 'America/New_York');
      if (weekday === 0 || weekday === 6) return false;
      return isWithin(hour, minute, 9, 30, 16, 0);
    }

    case 'cn_stock': {
      const { weekday, hour, minute } = toZoned(now, 'Asia/Shanghai');
      if (weekday === 0 || weekday === 6) return false;
      return (
        isWithin(hour, minute, 9, 30, 11, 30) || isWithin(hour, minute, 13, 0, 15, 0)
      );
    }

    case 'hk_stock': {
      const { weekday, hour, minute } = toZoned(now, 'Asia/Hong_Kong');
      if (weekday === 0 || weekday === 6) return false;
      return (
        isWithin(hour, minute, 9, 30, 12, 0) || isWithin(hour, minute, 13, 0, 16, 0)
      );
    }

    case 'forex':
    case 'cash': {
      // Forex: 周一 UTC 开盘到周五 UTC 收盘（Sydney Mon 08:00 ≈ Sun 22:00 UTC，这里从简按工作日）
      const { weekday } = toZoned(now, 'UTC');
      return weekday >= 1 && weekday <= 5;
    }

    case 'gold':
    case 'silver':
      // 贵金属跟伦敦/纽约，周末基本停盘。从简复用 forex 判断。
      return isMarketOpen('forex', now);

    default:
      return false;
  }
}

/**
 * 返回建议的缓存 TTL（秒）。开市 30s / 非开市 600s。
 */
export function getCacheTtlSeconds(category: MarketCategory, now: Date = new Date()): number {
  return isMarketOpen(category, now) ? 30 : 600;
}
