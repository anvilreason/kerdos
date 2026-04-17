/**
 * KV 缓存抽象 —— 支持 stale-while-revalidate（SWR）。
 *
 * 存储结构：
 *   key   → JSON.stringify(CacheEntry)
 * CacheEntry {
 *   value: T,
 *   cachedAt: ISO string,
 *   freshUntil: ISO string,   // 早于此时间读到就是 fresh
 *   staleUntil: ISO string,   // 早于此时间读到就是 stale 但仍可用
 * }
 *
 * 读取语义：
 *   - fresh  → 直接返回，stale=false
 *   - stale  → 返回 + 后台异步刷新（需要调用方传入 ctx.waitUntil）
 *   - expired→ 走兜底逻辑（上层决定：是刷新还是返回最后一次成功值）
 *
 * 当 KV 未绑定时（本地 dev 忘配 preview_id），自动降级为进程内 Map。
 */

export interface CacheEntry<T> {
  value: T;
  cachedAt: string; // ISO
  freshUntil: string;
  staleUntil: string;
}

export interface CacheReadResult<T> {
  entry: CacheEntry<T> | null;
  status: 'fresh' | 'stale' | 'miss';
}

// ============================================================================
// 进程内兜底 Map（KV 不可用时）
// ============================================================================
const inMemory = new Map<string, string>();
const IN_MEMORY_MAX_SIZE = 500; // 粗暴 LRU 上限，避免本地 dev 长时间跑爆内存

function memSet(key: string, raw: string): void {
  if (inMemory.size >= IN_MEMORY_MAX_SIZE) {
    // 简单 FIFO 淘汰，够用了
    const firstKey = inMemory.keys().next().value;
    if (firstKey !== undefined) inMemory.delete(firstKey);
  }
  inMemory.set(key, raw);
}

// ============================================================================
// 主缓存 API
// ============================================================================
export class Cache {
  constructor(private readonly kv: KVNamespace | undefined) {}

  async read<T>(key: string): Promise<CacheReadResult<T>> {
    let raw: string | null = null;
    if (this.kv) {
      try {
        raw = await this.kv.get(key);
      } catch (err) {
        console.warn('[cache] KV read error, falling back to memory:', err);
        raw = inMemory.get(key) ?? null;
      }
    } else {
      raw = inMemory.get(key) ?? null;
    }

    if (!raw) return { entry: null, status: 'miss' };

    let entry: CacheEntry<T>;
    try {
      entry = JSON.parse(raw) as CacheEntry<T>;
    } catch (err) {
      console.warn('[cache] JSON parse error for key', key, err);
      return { entry: null, status: 'miss' };
    }

    const now = Date.now();
    const freshUntilMs = Date.parse(entry.freshUntil);
    const staleUntilMs = Date.parse(entry.staleUntil);

    if (now < freshUntilMs) return { entry, status: 'fresh' };
    if (now < staleUntilMs) return { entry, status: 'stale' };
    return { entry, status: 'miss' };
  }

  /**
   * 写入缓存。ttlFreshSeconds 之内是 fresh；再往后 ttlStaleSeconds 之内是 stale。
   * 典型：fresh=30s, stale=3600s —— 即允许 1 小时的兜底 stale 回退窗口。
   */
  async write<T>(
    key: string,
    value: T,
    ttlFreshSeconds: number,
    ttlStaleSeconds: number = 3600,
  ): Promise<void> {
    const now = new Date();
    const freshUntil = new Date(now.getTime() + ttlFreshSeconds * 1000);
    const staleUntil = new Date(now.getTime() + (ttlFreshSeconds + ttlStaleSeconds) * 1000);

    const entry: CacheEntry<T> = {
      value,
      cachedAt: now.toISOString(),
      freshUntil: freshUntil.toISOString(),
      staleUntil: staleUntil.toISOString(),
    };
    const raw = JSON.stringify(entry);

    if (this.kv) {
      try {
        // Cloudflare KV 的 expirationTtl 至少 60s。低于 60s 就不传，让它靠 freshUntil 软过期。
        const kvTtl = ttlFreshSeconds + ttlStaleSeconds;
        if (kvTtl >= 60) {
          await this.kv.put(key, raw, { expirationTtl: kvTtl });
        } else {
          await this.kv.put(key, raw);
        }
        return;
      } catch (err) {
        console.warn('[cache] KV write error, falling back to memory:', err);
      }
    }
    memSet(key, raw);
  }

  /**
   * 仅兜底回退用 —— 读最后一次成功写入的值，不管新鲜度。
   * 用途：所有源都失败时，返回 stale 而不是 500。
   */
  async readLastKnown<T>(key: string): Promise<CacheEntry<T> | null> {
    const { entry } = await this.read<T>(key);
    return entry;
  }
}
