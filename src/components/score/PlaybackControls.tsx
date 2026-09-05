"use client";

import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type PlaybackControlsProps = {
  ready: boolean;
  playing: boolean;
  position: number;
  duration: number;
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (seconds: number) => void;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function PlaybackControls({
  ready,
  playing,
  position,
  duration,
  onPlayPause,
  onStop,
  onSeek,
}: PlaybackControlsProps) {
  return (
    <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-xl border bg-background/95 px-3 py-2 shadow-md backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <Button
        type="button"
        size="icon"
        variant="secondary"
        disabled={!ready}
        onClick={onPlayPause}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant="outline"
        disabled={!ready}
        onClick={onStop}
        aria-label="Stop"
      >
        <Square />
      </Button>
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {formatTime(position)}
      </span>
      <Slider
        className="flex-1"
        min={0}
        max={Math.max(duration, 0.01)}
        step={0.1}
        value={[Math.min(position, duration)]}
        disabled={!ready || duration === 0}
        onValueChange={(values) => onSeek(values[0] ?? 0)}
        aria-label="Playback position"
      />
      <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">
        {formatTime(duration)}
      </span>
    </div>
  );
}
