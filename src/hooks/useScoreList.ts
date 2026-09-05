"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { ScoreSummary } from "@/lib/scoreTypes";

export function useScoreList() {
  const [items, setItems] = useState<ScoreSummary[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await apiFetch<{ items: ScoreSummary[] }>("/api/scores");
    setItems(data.items);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    refresh()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Failed to load scores"));
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { items, error, isLoading, refresh };
}
