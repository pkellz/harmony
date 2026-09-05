"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlaybackControls } from "@/components/score/PlaybackControls";
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
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [tempoBpm, setTempoBpm] = useState(120);
  const scheduler = useMemo(() => new HarmonyScheduler(), []);
  const rafRef = useRef<number | null>(null);

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
        setDuration(scheduler.getDuration());
        setTempoBpm(parsed.tempoBpm);
        setPosition(0);
        scheduler.setOnEnded(() => {
          setPlaying(false);
          setPosition(0);
        });
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

  useEffect(() => {
    if (!playing) return;
    const tick = () => {
      setPosition(scheduler.getPosition());
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, scheduler]);

  const onPlayPause = useCallback(() => {
    if (playing) {
      scheduler.pause();
      setPlaying(false);
    } else {
      scheduler.play();
      setPlaying(true);
    }
  }, [playing, scheduler]);

  const onStop = useCallback(() => {
    scheduler.stop();
    setPlaying(false);
    setPosition(0);
  }, [scheduler]);

  const onSeek = useCallback(
    (seconds: number) => {
      scheduler.seek(seconds);
      setPosition(seconds);
    },
    [scheduler],
  );

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
      {score.voices ? (
        <Card>
          <CardHeader>
            <CardTitle>Voices</CardTitle>
          </CardHeader>
          <CardContent>
            <VoiceMixer
              voices={score.voices}
              mixer={mixer}
              onVolume={onVolume}
              onMute={onMute}
              onSolo={onSolo}
            />
          </CardContent>
        </Card>
      ) : null}
      <div className="flex flex-col gap-2">
        <ScoreView xml={xml} tempoBpm={tempoBpm} position={position} voices={score.voices} />
        <PlaybackControls
          ready={ready}
          playing={playing}
          position={position}
          duration={duration}
          onPlayPause={onPlayPause}
          onStop={onStop}
          onSeek={onSeek}
        />
      </div>
    </div>
  );
}
