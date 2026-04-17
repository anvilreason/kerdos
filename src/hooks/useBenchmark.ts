/**
 * useBenchmark — thin react-query wrapper around benchmarkService.getBenchmark.
 *
 * Contract:
 * - `id === null` → query disabled, returns { data: null, isLoading: false, error: null }.
 * - staleTime 5 min (Worker itself caches 1 h fresh, so UI-side 5 min is plenty).
 * - no refetch on window focus; benchmark data is macro-scale and visual,
 *   there's no value in refetching just because the user alt-tabbed back.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getBenchmark,
  type BenchmarkId,
  type BenchmarkRange,
  type BenchmarkResult,
} from '@/services/benchmarkService';

export interface UseBenchmarkResult {
  data: BenchmarkResult | null;
  isLoading: boolean;
  error: Error | null;
}

export function useBenchmark(
  id: BenchmarkId | null,
  range: BenchmarkRange,
): UseBenchmarkResult {
  const enabled = id !== null;

  const { data, isLoading, error } = useQuery<BenchmarkResult | null, Error>({
    queryKey: ['benchmark', id, range],
    // id is guaranteed non-null here because enabled short-circuits when null.
    queryFn: () => getBenchmark(id as BenchmarkId, range),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    data: data ?? null,
    // react-query reports isLoading even when disabled; normalise that away.
    isLoading: enabled && isLoading,
    error: error ?? null,
  };
}
