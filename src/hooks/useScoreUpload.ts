"use client";

import { useCallback } from "react";
import { apiFetch } from "@/lib/apiClient";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import type { ScoreSummary } from "@/lib/scoreTypes";

async function uploadScore(file: File): Promise<ScoreSummary> {
  const body = new FormData();
  body.append("file", file);
  const data = await apiFetch<{ score: ScoreSummary }>("/api/scores", {
    method: "POST",
    rawBody: body,
  });
  return data.score;
}

export function useScoreUpload() {
  const upload = useCallback((file: File) => uploadScore(file), []);
  return useAsyncAction(upload);
}
