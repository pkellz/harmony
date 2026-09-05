"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { ScorePlayer } from "@/components/score/ScorePlayer";
import { useScore } from "@/hooks/useScore";

type ScoreDetailPageProps = {
  scoreId: string;
};

export function ScoreDetailPage({ scoreId }: ScoreDetailPageProps) {
  const { score, error, isLoading } = useScore(scoreId);

  if (isLoading && !score) {
    return <p className="px-4 py-10 text-sm text-muted-foreground">Loading score…</p>;
  }

  if (error || !score) {
    return (
      <p className="px-4 py-10 text-sm text-destructive">
        {error?.message ?? "Score not found"}
      </p>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <Link href="/" className="text-sm text-muted-foreground hover:underline">
        ← All scores
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{score.title}</h1>
          <p className="text-sm text-muted-foreground">{score.originalFilename}</p>
        </div>
        <Badge>{score.status}</Badge>
      </header>
      {score.status === "failed" ? (
        <p className="text-sm text-destructive">{score.error ?? "OMR failed"}</p>
      ) : null}
      {score.status === "uploaded" || score.status === "converting" ? (
        <p className="text-sm text-muted-foreground">
          Waiting for the OMR worker. Keep this page open — it polls automatically.
          MusicXML uploads skip Audiveris and should flip to ready in a few seconds
          once `npm run worker` is running.
        </p>
      ) : null}
      {score.status === "ready" ? <ScorePlayer score={score} /> : null}
    </div>
  );
}
