import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { AssetType } from '@/types/asset';
import { searchTickers, type TickerResult } from '@/services/priceService';
import dictionary from '@/data/ticker-dictionary.json';
import { Input } from '@/components/ui/input';
import {
  Bitcoin,
  Gem,
  Euro,
  Landmark,
  LineChart,
  Search,
  Loader,
  Wifi,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type { TickerResult } from '@/services/priceService';

interface TickerSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (result: TickerResult) => void;
  placeholder?: string;
  id?: string;
  'aria-invalid'?: boolean;
}

// ---------------------------------------------------------------------------
// Local dictionary
// ---------------------------------------------------------------------------

interface DictEntry {
  symbol: string;
  name: string;
  aliases?: string[];
  exchange?: string;
  type: AssetType;
  currency: string;
}

interface DictFile {
  version: string;
  updatedAt: string;
  entries: DictEntry[];
}

const DICT: DictEntry[] = (dictionary as DictFile).entries;

/** Score a dictionary entry against a lowercase query. Higher is better. */
function scoreDictEntry(entry: DictEntry, qLower: string): number {
  const symLower = entry.symbol.toLowerCase();
  const nameLower = entry.name.toLowerCase();

  // Exact symbol match
  if (symLower === qLower) return 1000;
  // Symbol starts with query (e.g. "tsl" → "tsla")
  if (symLower.startsWith(qLower)) return 800;
  // Symbol up to first dot (A-share / HK) matches (e.g. "600519" → "600519.SS")
  const baseSym = symLower.split('.')[0];
  if (baseSym === qLower) return 900;
  if (baseSym.startsWith(qLower)) return 700;

  // Alias exact match (case-insensitive)
  if (entry.aliases?.some((a) => a.toLowerCase() === qLower)) return 600;
  // Alias starts-with (e.g. "特" → "特斯拉")
  if (entry.aliases?.some((a) => a.toLowerCase().startsWith(qLower))) return 500;
  // Alias contains
  if (entry.aliases?.some((a) => a.toLowerCase().includes(qLower))) return 300;

  // Name starts-with
  if (nameLower.startsWith(qLower)) return 400;
  // Name contains
  if (nameLower.includes(qLower)) return 200;

  return 0;
}

function searchLocalDict(query: string, limit = 8): TickerResult[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const scored: Array<{ entry: DictEntry; score: number }> = [];
  for (const entry of DICT) {
    const s = scoreDictEntry(entry, q);
    if (s > 0) scored.push({ entry, score: s });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map(({ entry }) => ({
    symbol: entry.symbol,
    name: entry.name,
    exchange: entry.exchange,
    type: entry.type,
    currency: entry.currency,
    source: 'local' as const,
  }));
}

// ---------------------------------------------------------------------------
// Type icon
// ---------------------------------------------------------------------------

function TypeIcon({ type }: { type: AssetType }) {
  const style: React.CSSProperties = {
    width: 14,
    height: 14,
    color: 'var(--color-text-muted)',
    flexShrink: 0,
  };
  switch (type) {
    case 'crypto':
      return <Bitcoin style={style} />;
    case 'gold':
      return <Gem style={style} />;
    case 'forex':
      return <Euro style={style} />;
    case 'etf':
      return <LineChart style={style} />;
    case 'us_stock':
    case 'cn_stock':
      return <Landmark style={style} />;
    default:
      return <Landmark style={style} />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 250;
const MAX_RESULTS = 8;

export default function TickerSearch({
  value,
  onChange,
  onSelect,
  placeholder,
  id,
  'aria-invalid': ariaInvalid,
}: TickerSearchProps) {
  const [results, setResults] = useState<TickerResult[]>([]);
  const [open, setOpen] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resultsSource, setResultsSource] = useState<'worker' | 'local' | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = `ticker-search-listbox-${useId()}`;

  // Track the most recent query string so stale async responses don't clobber
  // fresh ones (user keeps typing while a request is in flight).
  const activeQueryRef = useRef<string>('');

  const runSearch = useCallback(async (q: string): Promise<void> => {
    // Offline short-circuit — don't waste a 2s timeout when we know we can't
    // reach the relay.
    const online = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    let workerResults: TickerResult[] = [];
    if (online) {
      workerResults = await searchTickers(q);
    }

    // Bail if the query changed while we were awaiting.
    if (activeQueryRef.current !== q) return;

    if (workerResults.length > 0) {
      setResults(workerResults.slice(0, MAX_RESULTS));
      setResultsSource('worker');
    } else {
      const local = searchLocalDict(q, MAX_RESULTS);
      setResults(local);
      setResultsSource('local');
    }
    setHighlightedIdx(0);
    setLoading(false);
    setHasSearched(true);
    setOpen(true);
  }, []);

  // --- Debounced search ---
  useEffect(() => {
    const q = value.trim();
    if (q.length === 0) {
      setResults([]);
      setHasSearched(false);
      setLoading(false);
      setResultsSource(null);
      return;
    }

    activeQueryRef.current = q;
    setLoading(true);
    const timer = setTimeout(() => {
      void runSearch(q);
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [value, runSearch]);

  // --- Close on outside click ---
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function handleSelect(result: TickerResult): void {
    onSelect(result);
    onChange(result.symbol);
    setOpen(false);
    setResults([]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (!open || results.length === 0) {
      if (e.key === 'ArrowDown' && results.length > 0) {
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIdx((i) => (i + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIdx((i) => (i - 1 + results.length) % results.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (results[highlightedIdx]) handleSelect(results[highlightedIdx]);
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      default:
        break;
    }
  }

  const showNoMatch = open && hasSearched && !loading && results.length === 0;
  const showDropdown = open && (results.length > 0 || showNoMatch);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        onFocus={() => {
          if (results.length > 0 || hasSearched) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        aria-invalid={ariaInvalid}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls={showDropdown ? listboxId : undefined}
        role="combobox"
      />

      {loading && (
        <div
          style={{
            position: 'absolute',
            right: 8,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: 'var(--color-text-muted)',
            display: 'flex',
            alignItems: 'center',
          }}
          aria-hidden
        >
          <Loader
            width={14}
            height={14}
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 50,
            background: 'var(--color-base-05)',
            border: '1px solid var(--color-base-20)',
            borderRadius: 6,
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.24)',
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {results.length > 0 && (
            <>
              {/* Source badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 4,
                  padding: '6px 10px 4px',
                  fontSize: 10,
                  textTransform: 'uppercase',
                  color: 'var(--color-text-faint)',
                  letterSpacing: 0.4,
                }}
              >
                {resultsSource === 'worker' ? (
                  <>
                    <Wifi width={10} height={10} />
                    <span>live</span>
                  </>
                ) : (
                  <>
                    <Search width={10} height={10} />
                    <span>cached</span>
                  </>
                )}
              </div>
              {results.map((r, idx) => {
                const isHi = idx === highlightedIdx;
                return (
                  <button
                    key={`${r.source}:${r.symbol}:${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isHi}
                    onMouseEnter={() => setHighlightedIdx(idx)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(r)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '8px 10px',
                      background: isHi ? 'var(--color-base-15)' : 'transparent',
                      border: 'none',
                      borderTop: '1px solid var(--color-base-10)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      color: 'var(--color-text-normal)',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-monospace)',
                        fontWeight: 600,
                        fontSize: 13,
                        color: 'var(--color-text-normal)',
                        minWidth: 80,
                      }}
                    >
                      {r.symbol}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: 'var(--color-text-normal)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {r.name}
                    </span>
                    {r.exchange && (
                      <span
                        style={{
                          fontSize: 11,
                          color: 'var(--color-text-faint)',
                          flexShrink: 0,
                        }}
                      >
                        {r.exchange}
                      </span>
                    )}
                    <TypeIcon type={r.type} />
                  </button>
                );
              })}
            </>
          )}
          {showNoMatch && (
            <div
              style={{
                padding: '10px 12px',
                fontSize: 12,
                color: 'var(--color-text-muted)',
              }}
            >
              No match. Try full ticker (e.g. TSLA).
            </div>
          )}
        </div>
      )}
    </div>
  );
}
