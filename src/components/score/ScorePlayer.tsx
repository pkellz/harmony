"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreView } from "@/components/score/ScoreView";
import { VoiceMixer } from "@/components/score/VoiceMixer";
import { apiFetch } from "@/lib/apiClient";
import { HarmonyScheduler, type MixerState } from "@/lib/audio/Scheduler";
import { parseScore } from "@/domain/musicxml/parseScore";
import type { ScoreSummary } from "@/lib/scoreTypes";

type ScorePlayerProps = {
  score: ScoreSummary;
};

const DEFAULT_MIX: MixerState = { volume: 0.85, muted: false, soloed: false };

export function ScorePlayer({ score }: ScorePlayerProps) {
  const [xml, setXml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [mixer, setMixer] = useState<Record<string, MixerState>>({});
  const scheduler = useMemo(() => new HarmonyScheduler(), []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const text = await apiFetch<string>(`/api/scores/${score.id}/musicxml`, {
          parseAs: "text",
        });
        if (cancelled) return;
        setXml(text);
        const parsed = parseScore(text);
        await scheduler.load(parsed);
        if (cancelled) return;
        const initial: Record<string, MixerState> = {};
        for (const voice of parsed.voices) {
          initial[voice.id] = { ...DEFAULT_MIX };
        }
        setMixer(initial);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load MusicXML";
        setLoadError(message);
        toast.error(message);
      }
    })();
    return () => {
      cancelled = true;
      void scheduler.dispose();
      setPlaying(false);
      setReady(false);
    };
  }, [scheduler, score.id]);

  const onPlay = useCallback(() => {
    scheduler.play();
    setPlaying(true);
  }, [scheduler]);

  const onPause = useCallback(() => {
    scheduler.pause();
    setPlaying(false);
  }, [scheduler]);

  const onStop = useCallback(() => {
    scheduler.stop();
    setPlaying(false);
  }, [scheduler]);

  const onVolume = useCallback(
    (voiceId: string, volume: number) => {
      scheduler.setVolume(voiceId, volume);
      setMixer((prev) => ({
        ...prev,
        [voiceId]: { ...(prev[voiceId] ?? DEFAULT_MIX), volume },
      }));
    },
    [scheduler],
  );

  const onMute = useCallback(
    (voiceId: string, muted: boolean) => {
      scheduler.setMuted(voiceId, muted);
      setMixer((prev) => ({
        ...prev,
        [voiceId]: { ...(prev[voiceId] ?? DEFAULT_MIX), muted },
      }));
    },
    [scheduler],
  );

  const onSolo = useCallback(
    (voiceId: string, soloed: boolean) => {
      scheduler.setSoloed(voiceId, soloed);
      setMixer((prev) => ({
        ...prev,
        [voiceId]: { ...(prev[voiceId] ?? DEFAULT_MIX), soloed },
      }));
    },
    [scheduler],
  );

  if (loadError) {
    return <p className="text-sm text-destructive">{loadError}</p>;
  }

  if (!xml) {
    return <p className="text-sm text-muted-foreground">Loading score…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Playback</CardTitle>
          <div className="flex gap-2">
            <Button type="button" disabled={!ready} onClick={onPlay}>
              {playing ? "Playing" : "Play"}
            </Button>
            <Button type="button" variant="secondary" disabled={!ready} onClick={onPause}>
              Pause
            </Button>
            <Button type="button" variant="outline" disabled={!ready} onClick={onStop}>
              Stop
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {score.voices ? (
            <VoiceMixer
              voices={score.voices}
              mixer={mixer}
              onVolume={onVolume}
              onMute={onMute}
              onSolo={onSolo}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No voices detected.</p>
          )}
        </CardContent>
      </Card>
      <ScoreView xml={xml} />
    </div>
  );
}
