"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import type { ScoreSummary } from "@/lib/scoreTypes";

const POLL_MS = 2000;

export function useScore(id: string) {
  const [score, setScore] = useState<ScoreSummary | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await apiFetch<{ score: ScoreSummary }>(`/api/scores/${id}`);
    setScore(data.score);
    return data.score;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      try {
        const next = await load();
        if (cancelled) return;
        setError(null);
        setIsLoading(false);
        if (next.status === "uploaded" || next.status === "converting") {
          timer = setTimeout(tick, POLL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error("Failed to load score"));
        setIsLoading(false);
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load]);

  return { score, error, isLoading };
}
