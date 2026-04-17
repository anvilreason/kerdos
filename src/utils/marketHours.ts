/**
 * marketHours.ts — Market-session awareness for smart polling (T-W2-03).
 *
 * Given an AssetType, resolves its governing market (US equity, CN equity,
 * HK equity, crypto, forex, none) and determines whether that market is
 * currently open, accounting for weekends, intraday breaks (CN/HK), and
 * hardcoded 2026 holidays.
 *
 * Time-zone handling is done via `Intl.DateTimeFormat` with the IANA zone
 * name — no external date library is used. We format the given `Date` into
 * the local wall-clock of the market's timezone, then parse the weekday +
 * hour + minute to judge the session.
 *
 * --- Manual verification cases (sanity checks, no unit test yet; W3 adds) ---
 *
 *   Case A — US equity during New York daytime Tue 2026-04-21 14:00 ET:
 *     new Date('2026-04-21T18:00:00Z')  // 14:00 ET (EDT, UTC-4 in April)
 *     isMarketOpen('us_equity', …) === true
 *
 *   Case B — US equity on MLK Day 2026-01-19 14:00 ET (holiday):
 *     new Date('2026-01-19T19:00:00Z')  // 14:00 ET (EST, UTC-5 in Jan)
 *     isMarketOpen('us_equity', …) === false
 *
 *   Case C — CN equity during lunch break 2026-04-21 12:00 CST:
 *     new Date('2026-04-21T04:00:00Z')  // 12:00 CST
 *     isMarketOpen('cn_equity', …) === false  (lunch 11:30–13:00)
 *
 *   Case D — Crypto anytime:
 *     isMarketOpen('crypto', new Date()) === true  (always)
 *
 *   Case E — Forex Saturday 2026-04-18 12:00 UTC (weekend close):
 *     new Date('2026-04-18T12:00:00Z')
 *     isMarketOpen('forex', …) === false  (closed Sat 04:00 → Mon 04:00 UTC)
 *
 *   Case F — HK equity during lunch break 2026-04-21 12:30 HKT:
 *     new Date('2026-04-21T04:30:00Z')  // 12:30 HKT (UTC+8)
 *     isMarketOpen('hk_equity', …) === false  (lunch 12:00–13:00)
 *
 * --- Holiday data source ---
 *   · US (NYSE): https://www.nyse.com/markets/hours-calendars (official list)
 *   · CN (SSE):  Spring Festival 2026 = Feb 16–24 (official State Council
 *                notice 2025-11). Other dates follow the published holiday
 *                calendar for 2026. Some dates marked [推测] where the
 *                official 2026 calendar had not been fully released at time
 *                of writing — revisit before 2026-01-01.
 *   · HK (HKEX): Mix of US-federal-style observances and Chinese holidays.
 */

import type { AssetType } from '@/types/asset';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MarketKind =
  | 'us_equity'
  | 'cn_equity'
  | 'hk_equity'
  | 'crypto'
  | 'forex'
  | 'none';

// ---------------------------------------------------------------------------
// Holiday tables (YYYY-MM-DD, local to each market's timezone)
// ---------------------------------------------------------------------------

/**
 * NYSE 2026 full-day closures.
 * Good Friday (Apr 3) is a market holiday even though it isn't a federal one.
 * Source: NYSE holiday calendar (https://www.nyse.com/markets/hours-calendars).
 */
const US_HOLIDAYS_2026: ReadonlySet<string> = new Set<string>([
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day (3rd Mon of Jan)
  '2026-02-16', // Washington's Birthday / Presidents Day (3rd Mon of Feb)
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day (last Mon of May)
  '2026-06-19', // Juneteenth National Independence Day
  '2026-07-03', // Independence Day observed (Jul 4 is Sat → obs on Fri Jul 3)
  '2026-09-07', // Labor Day (1st Mon of Sep)
  '2026-11-26', // Thanksgiving (4th Thu of Nov)
  '2026-12-25', // Christmas Day
]);

/**
 * SSE / SZSE 2026 full-day closures. Dates in Shanghai local time.
 *
 * Spring Festival: Feb 16 (Mon) is Lunar New Year's Day; the official
 * State Council 2026 holiday notice sets exchange closure Feb 16–24
 * (Mon–Tue following week). [推测] on Tue-swap work days — the makeup
 * working Saturdays only affect offices, not exchange trading hours.
 * Other dates follow the published 2026 calendar; re-verify late 2025.
 */
const CN_HOLIDAYS_2026: ReadonlySet<string> = new Set<string>([
  '2026-01-01', // New Year's Day
  // Spring Festival (Chinese New Year) — Feb 16–24 (9 days including
  // weekend). Exchanges are closed Feb 16–20 (Mon–Fri) and Feb 23–24
  // (Mon–Tue); Feb 21–22 are weekend anyway.
  '2026-02-16',
  '2026-02-17',
  '2026-02-18',
  '2026-02-19',
  '2026-02-20',
  '2026-02-23',
  '2026-02-24',
  '2026-04-06', // Qingming (Tomb-Sweeping) observed — Apr 5 is Sun [推测]
  '2026-05-01', // Labour Day (May 1)
  '2026-06-19', // Dragon Boat Festival observed [推测] (lunar May 5 = Jun 19)
  '2026-09-25', // Mid-Autumn Festival [推测] (lunar Aug 15 = Sep 25)
  '2026-10-01', // National Day
  '2026-10-02',
  '2026-10-05',
  '2026-10-06',
  '2026-10-07',
  '2026-10-08',
]);

/**
 * HKEX 2026 full-day closures (Hong Kong local time).
 * Mix of Gregorian (Christmas) and lunar (CNY, Qingming, Buddha's
 * Birthday, Dragon Boat, Mid-Autumn) + HKSAR/Nat'l holidays.
 * Several dates are [推测] pending HKEX's 2026 calendar release.
 */
const HK_HOLIDAYS_2026: ReadonlySet<string> = new Set<string>([
  '2026-01-01', // New Year's Day
  '2026-02-17', // Lunar NY day 2 [推测] (Feb 16 Mon = NY's Day 1; Feb 17 Tue obs)
  '2026-02-18', // Lunar NY day 3 [推测]
  '2026-02-19', // Lunar NY day 4 [推测]
  '2026-04-03', // Good Friday
  '2026-04-06', // Easter Monday (also overlaps Qingming observed) [推测]
  '2026-05-01', // Labour Day
  '2026-05-25', // Buddha's Birthday [推测]
  '2026-06-19', // Dragon Boat Festival [推测]
  '2026-07-01', // HKSAR Establishment Day
  '2026-09-25', // Day following Mid-Autumn Festival [推测]
  '2026-10-01', // National Day (PRC)
  '2026-10-19', // Chung Yeung Festival [推测]
  '2026-12-25', // Christmas
  '2026-12-28', // First weekday after Christmas [推测]
]);

// ---------------------------------------------------------------------------
// AssetType → MarketKind mapping
// ---------------------------------------------------------------------------

/**
 * Resolve the governing market for an AssetType.
 *
 * ETF disambiguation happens via `marketForAsset(asset)` when the caller
 * has a ticker in hand — the raw `marketFor(type)` returns `us_equity` as
 * the sensible default when ETF ticker context is unavailable.
 */
export function marketFor(assetType: AssetType): MarketKind {
  switch (assetType) {
    case 'us_stock':
      return 'us_equity';
    case 'cn_stock':
      return 'cn_equity';
    case 'etf':
      return 'us_equity'; // default fallback; see marketForAsset() for ticker-aware resolution
    case 'crypto':
      return 'crypto';
    case 'gold':
    case 'forex':
      return 'forex';
    case 'real_estate':
    case 'vehicle':
    case 'cash':
    case 'other':
      return 'none';
    default: {
      // Exhaustiveness guard — if a new AssetType is added we want a TS error.
      const _exhaustive: never = assetType;
      void _exhaustive;
      return 'none';
    }
  }
}

/**
 * Ticker-aware ETF market resolution.
 * `.SS` / `.SZ` → Shanghai / Shenzhen → cn_equity
 * `.HK`         → Hong Kong            → hk_equity
 * anything else (or missing)            → us_equity
 */
export function marketForAsset(asset: {
  type: AssetType;
  ticker?: string;
}): MarketKind {
  if (asset.type !== 'etf') return marketFor(asset.type);
  const t = asset.ticker?.toUpperCase() ?? '';
  if (t.endsWith('.SS') || t.endsWith('.SZ')) return 'cn_equity';
  if (t.endsWith('.HK')) return 'hk_equity';
  return 'us_equity';
}

// ---------------------------------------------------------------------------
// Timezone helpers (Intl-based — no external dep)
// ---------------------------------------------------------------------------

interface LocalParts {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  weekday: number; // 0=Sun … 6=Sat
  hour: number; // 0–23
  minute: number; // 0–59
  iso: string; // "YYYY-MM-DD"
}

/** Shared Intl formatters (one per zone, memoised lazily). */
const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();
function getFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = FORMATTER_CACHE.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    FORMATTER_CACHE.set(timeZone, fmt);
  }
  return fmt;
}

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Project `Date` into `timeZone`'s wall clock and extract the parts
 * needed for session checks.
 */
function localParts(now: Date, timeZone: string): LocalParts {
  const fmt = getFormatter(timeZone);
  const parts = fmt.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  const hour = Number(get('hour'));
  const minute = Number(get('minute'));
  const weekdayStr = get('weekday');
  const weekday = WEEKDAY_MAP[weekdayStr] ?? 0;
  const iso = `${pad4(year)}-${pad2(month)}-${pad2(day)}`;
  return { year, month, day, weekday, hour, minute, iso };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

function minutesSinceMidnight(p: LocalParts): number {
  return p.hour * 60 + p.minute;
}

// ---------------------------------------------------------------------------
// Per-market session rules
// ---------------------------------------------------------------------------

interface EquityRules {
  timeZone: string;
  sessions: Array<{ startMin: number; endMin: number }>;
  holidays: ReadonlySet<string>;
}

// Weekdays only (Mon–Fri) for equity markets. 24-hour minute format.
const US_RULES: EquityRules = {
  timeZone: 'America/New_York',
  // Regular session 09:30–16:00 ET (no lunch break on NYSE/NASDAQ).
  sessions: [{ startMin: 9 * 60 + 30, endMin: 16 * 60 }],
  holidays: US_HOLIDAYS_2026,
};

const CN_RULES: EquityRules = {
  timeZone: 'Asia/Shanghai',
  // Morning 09:30–11:30, afternoon 13:00–15:00.
  sessions: [
    { startMin: 9 * 60 + 30, endMin: 11 * 60 + 30 },
    { startMin: 13 * 60, endMin: 15 * 60 },
  ],
  holidays: CN_HOLIDAYS_2026,
};

const HK_RULES: EquityRules = {
  timeZone: 'Asia/Hong_Kong',
  // Morning 09:30–12:00, afternoon 13:00–16:00.
  sessions: [
    { startMin: 9 * 60 + 30, endMin: 12 * 60 },
    { startMin: 13 * 60, endMin: 16 * 60 },
  ],
  holidays: HK_HOLIDAYS_2026,
};

function isEquityOpen(rules: EquityRules, now: Date): boolean {
  const p = localParts(now, rules.timeZone);
  // 0=Sun, 6=Sat — closed on weekends.
  if (p.weekday === 0 || p.weekday === 6) return false;
  if (rules.holidays.has(p.iso)) return false;
  const mins = minutesSinceMidnight(p);
  return rules.sessions.some((s) => mins >= s.startMin && mins < s.endMin);
}

/**
 * Forex: closed Saturday 04:00 UTC through Monday 04:00 UTC.
 * (Approximation of the global FX off-hours window; in practice liquidity
 * spans Sydney open Sun ~22:00 UTC through NY close Fri ~22:00 UTC. 04:00 UTC
 * is chosen as the no-trade midpoint that matches common FX broker schedules.)
 */
function isForexOpen(now: Date): boolean {
  const dow = now.getUTCDay(); // 0=Sun … 6=Sat
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const cutoff = 4 * 60; // 04:00 UTC
  if (dow === 6) {
    // Saturday: open only before 04:00 UTC (carryover from Fri)
    return minutes < cutoff;
  }
  if (dow === 0) {
    // Sunday: closed all day (reopens Mon 04:00 UTC)
    return false;
  }
  if (dow === 1) {
    // Monday: closed until 04:00 UTC, open after
    return minutes >= cutoff;
  }
  // Tue–Fri: open 24h
  return true;
}

// ---------------------------------------------------------------------------
// Public API — isMarketOpen, nextOpenTime, anyOpen
// ---------------------------------------------------------------------------

export function isMarketOpen(market: MarketKind, now: Date = new Date()): boolean {
  switch (market) {
    case 'us_equity':
      return isEquityOpen(US_RULES, now);
    case 'cn_equity':
      return isEquityOpen(CN_RULES, now);
    case 'hk_equity':
      return isEquityOpen(HK_RULES, now);
    case 'crypto':
      return true;
    case 'forex':
      return isForexOpen(now);
    case 'none':
      return false;
    default: {
      const _exhaustive: never = market;
      void _exhaustive;
      return false;
    }
  }
}

export function anyOpen(markets: MarketKind[], now: Date = new Date()): boolean {
  for (const m of markets) {
    if (isMarketOpen(m, now)) return true;
  }
  return false;
}

/**
 * Compute the next time the market will open.
 * - crypto: always open → returns null
 * - none  : never opens → returns null
 * - equity: searches up to 10 calendar days ahead (enough to clear any
 *   Spring Festival-length closure)
 * - forex: resolves to the next Mon 04:00 UTC when closed
 */
export function nextOpenTime(
  market: MarketKind,
  now: Date = new Date(),
): Date | null {
  switch (market) {
    case 'crypto':
    case 'none':
      return null;
    case 'forex':
      return nextForexOpen(now);
    case 'us_equity':
      return nextEquityOpen(US_RULES, now);
    case 'cn_equity':
      return nextEquityOpen(CN_RULES, now);
    case 'hk_equity':
      return nextEquityOpen(HK_RULES, now);
    default: {
      const _exhaustive: never = market;
      void _exhaustive;
      return null;
    }
  }
}

function nextForexOpen(now: Date): Date | null {
  if (isForexOpen(now)) return now;
  // Forex reopens at Monday 04:00 UTC.
  const d = new Date(now.getTime());
  // Walk forward day by day until we hit Monday, then pin to 04:00 UTC.
  for (let i = 0; i < 4; i++) {
    if (d.getUTCDay() === 1) {
      const target = new Date(
        Date.UTC(
          d.getUTCFullYear(),
          d.getUTCMonth(),
          d.getUTCDate(),
          4, 0, 0, 0,
        ),
      );
      if (target.getTime() > now.getTime()) return target;
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return null;
}

/**
 * Walk forward minute-by-session until we find the next open session start.
 * Looks up to 10 days ahead (handles Spring Festival ≤ 9-day run).
 */
function nextEquityOpen(rules: EquityRules, now: Date): Date | null {
  if (isEquityOpen(rules, now)) return now;

  // Try each of the next 10 calendar days in the market's timezone.
  for (let offsetDays = 0; offsetDays <= 10; offsetDays++) {
    const candidate = new Date(now.getTime() + offsetDays * 86400_000);
    const p = localParts(candidate, rules.timeZone);
    if (p.weekday === 0 || p.weekday === 6) continue;
    if (rules.holidays.has(p.iso)) continue;

    const nowMins = offsetDays === 0 ? minutesSinceMidnight(p) : -1;
    for (const s of rules.sessions) {
      if (s.startMin > nowMins) {
        // Translate `p.iso` + startMin back into a UTC Date by constructing
        // the local ISO string and using Intl to find the matching Date.
        return localTimeToDate(p.iso, s.startMin, rules.timeZone);
      }
    }
  }
  return null;
}

/**
 * Convert a local wall-clock (iso day + minutes-of-day) in `timeZone`
 * back to a UTC `Date`. Uses the zone's current offset at that instant,
 * iterating once to correct for DST around the conversion point.
 */
function localTimeToDate(isoDay: string, minutes: number, timeZone: string): Date {
  const [y, m, d] = isoDay.split('-').map(Number);
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  // First guess: treat local time as UTC and adjust by the zone offset.
  const guess = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh, mm, 0));
  const offsetMin = getZoneOffsetMinutes(guess, timeZone);
  const corrected = new Date(guess.getTime() - offsetMin * 60_000);
  // Re-compute offset at corrected instant; if different (DST boundary), fix again.
  const offsetMin2 = getZoneOffsetMinutes(corrected, timeZone);
  if (offsetMin2 !== offsetMin) {
    return new Date(guess.getTime() - offsetMin2 * 60_000);
  }
  return corrected;
}

/**
 * Offset of `timeZone` at `at`, in minutes east of UTC.
 * Example: America/New_York in April → -240 (EDT is UTC-4).
 */
function getZoneOffsetMinutes(at: Date, timeZone: string): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const asUTC = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  );
  return Math.round((asUTC - at.getTime()) / 60_000);
}
