"use client";

import { ScoreList } from "@/components/score/ScoreList";
import { ScoreUploader } from "@/components/score/ScoreUploader";
import { useScoreList } from "@/hooks/useScoreList";

export function HomePage() {
  const { items, error, isLoading, refresh } = useScoreList();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <p className="text-sm uppercase tracking-wide text-muted-foreground">
          Harmony MVP
        </p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Practice each voice of a choral score
        </h1>
        <p className="text-muted-foreground">
          Upload SATB + piano sheet music, isolate soprano / alto / tenor / bass,
          and mix volumes while you sing along.
        </p>
      </header>
      <ScoreUploader onUploaded={() => void refresh()} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Scores</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{error.message}</p>
        ) : (
          <ScoreList items={items} />
        )}
      </section>
    </div>
  );
}
