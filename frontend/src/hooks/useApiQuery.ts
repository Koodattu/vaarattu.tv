"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiResponse } from "@/types/api";

/** Fetch a memoized request; only its latest, non-cancelled response can render. */
export function useApiQuery<T>(load: ((signal: AbortSignal) => Promise<ApiResponse<T>>) | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ load: typeof load; attempt: number; response: ApiResponse<T> }>();
  useEffect(() => {
    if (!load) return;
    const controller = new AbortController();
    void load(controller.signal).then(response => {
      if (!controller.signal.aborted) setResult({ load, attempt, response });
    });
    return () => controller.abort();
  }, [load, attempt]);
  const response = result?.load === load && result?.attempt === attempt ? result.response : undefined;
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return { response, loading: load !== null && !response, retry };
}
