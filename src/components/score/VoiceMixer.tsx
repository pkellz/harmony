"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { MixerState } from "@/lib/audio/Scheduler";
import type { ScoreVoice } from "@/lib/scoreTypes";

type VoiceMixerProps = {
  voices: ScoreVoice[];
  mixer: Record<string, MixerState>;
  onVolume: (voiceId: string, volume: number) => void;
  onMute: (voiceId: string, muted: boolean) => void;
  onSolo: (voiceId: string, soloed: boolean) => void;
};

export function VoiceMixer({
  voices,
  mixer,
  onVolume,
  onMute,
  onSolo,
}: VoiceMixerProps) {
  return (
    <div className="flex flex-col gap-4">
      {voices.map((voice) => {
        const state = mixer[voice.id] ?? {
          volume: 0.85,
          muted: false,
          soloed: false,
        };
        return (
          <VoiceStrip
            key={voice.id}
            voice={voice}
            state={state}
            onVolume={onVolume}
            onMute={onMute}
            onSolo={onSolo}
          />
        );
      })}
    </div>
  );
}

type VoiceStripProps = {
  voice: ScoreVoice;
  state: MixerState;
  onVolume: (voiceId: string, volume: number) => void;
  onMute: (voiceId: string, muted: boolean) => void;
  onSolo: (voiceId: string, soloed: boolean) => void;
};

function VoiceStrip({
  voice,
  state,
  onVolume,
  onMute,
  onSolo,
}: VoiceStripProps) {
  return (
    <div className="grid gap-2 rounded-lg border p-3 md:grid-cols-[minmax(0,1fr)_2fr_auto] md:items-center">
      <div className="min-w-0">
        <Label htmlFor={`vol-${voice.id}`}>{voice.label}</Label>
        <p className="truncate text-xs text-muted-foreground">
          {voice.id}
          {voice.partName ? ` · ${voice.partName}` : ""} · {voice.noteCount} notes
        </p>
      </div>
      <Slider
        id={`vol-${voice.id}`}
        min={0}
        max={1}
        step={0.01}
        value={[state.volume]}
        onValueChange={(values) => onVolume(voice.id, values[0] ?? 0)}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={state.muted ? "destructive" : "outline"}
          onClick={() => onMute(voice.id, !state.muted)}
        >
          Mute
        </Button>
        <Button
          type="button"
          size="sm"
          variant={state.soloed ? "default" : "outline"}
          onClick={() => onSolo(voice.id, !state.soloed)}
        >
          Solo
        </Button>
      </div>
    </div>
  );
}
