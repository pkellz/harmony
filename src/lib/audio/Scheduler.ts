import type { NoteEvent, ParsedScore } from "@/domain/musicxml/parseScore";

type ToneModule = typeof import("tone");
type Gain = import("tone").Gain;
type Instrument = import("tone").Sampler | import("tone").PolySynth;

export type MixerState = {
  volume: number;
  muted: boolean;
  soloed: boolean;
};

const DEFAULT_MIXER: MixerState = { volume: 0.85, muted: false, soloed: false };

function midiToNoteName(midi: number): string {
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const pitch = names[((midi % 12) + 12) % 12] ?? "C";
  const octave = Math.floor(midi / 12) - 1;
  return `${pitch}${octave}`;
}

function effectiveGain(mixer: MixerState, anySolo: boolean): number {
  if (mixer.muted) return 0;
  if (anySolo && !mixer.soloed) return 0;
  return mixer.volume;
}

export class HarmonyScheduler {
  private Tone: ToneModule | null = null;
  private instruments = new Map<string, Instrument>();
  private gains = new Map<string, Gain>();
  private mixer = new Map<string, MixerState>();
  private events: NoteEvent[] = [];
  private tempoBpm = 120;
  private loaded = false;
  private duration = 0;
  private onEnded: (() => void) | null = null;

  async load(score: ParsedScore): Promise<void> {
    await this.dispose();
    const Tone = await import("tone");
    this.Tone = Tone;
    this.events = score.events;
    this.tempoBpm = score.tempoBpm;

    await Tone.start();
    Tone.Transport.stop();
    Tone.Transport.position = 0;
    Tone.Transport.bpm.value = this.tempoBpm;

    for (const voice of score.voices) {
      this.mixer.set(voice.id, { ...DEFAULT_MIXER });
      const gain = new Tone.Gain(DEFAULT_MIXER.volume).toDestination();
      this.gains.set(voice.id, gain);
      const instrument = await this.createInstrument(Tone);
      instrument.connect(gain);
      this.instruments.set(voice.id, instrument);
    }

    const secondsPerQuarter = 60 / this.tempoBpm;
    let endSeconds = 0;
    for (const event of this.events) {
      const instrument = this.instruments.get(event.voiceId);
      if (!instrument) continue;
      const start = event.startQuarter * secondsPerQuarter;
      const duration = Math.max(event.durationQuarter * secondsPerQuarter, 0.05);
      const note = midiToNoteName(event.midi);
      Tone.Transport.schedule((time) => {
        instrument.triggerAttackRelease(note, duration, time);
      }, start);
      endSeconds = Math.max(endSeconds, start + duration);
    }
    this.duration = endSeconds;
    if (endSeconds > 0) {
      Tone.Transport.scheduleOnce(() => {
        this.stop();
        this.onEnded?.();
      }, endSeconds);
    }

    this.loaded = true;
  }

  setOnEnded(callback: (() => void) | null): void {
    this.onEnded = callback;
  }

  getDuration(): number {
    return this.duration;
  }

  getPosition(): number {
    if (!this.Tone) return 0;
    return Math.min(this.Tone.Transport.seconds, this.duration);
  }

  seek(seconds: number): void {
    if (!this.Tone) return;
    const clamped = Math.min(Math.max(seconds, 0), this.duration);
    this.Tone.Transport.seconds = clamped;
  }

  private async createInstrument(Tone: ToneModule): Promise<Instrument> {
    const sampler = new Tone.Sampler({
      urls: {
        C2: "C2.mp3",
        C3: "C3.mp3",
        C4: "C4.mp3",
        "D#4": "Ds4.mp3",
        "F#4": "Fs4.mp3",
        A4: "A4.mp3",
        C5: "C5.mp3",
      },
      baseUrl: "https://tonejs.github.io/audio/salamander/",
    });
    try {
      await Promise.race([
        Tone.loaded(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("sampler timeout")), 8000);
        }),
      ]);
      return sampler;
    } catch {
      sampler.dispose();
      return new Tone.PolySynth(Tone.Synth);
    }
  }

  play(): void {
    if (!this.Tone || !this.loaded) return;
    if (this.Tone.Transport.state === "started") return;
    void this.Tone.start();
    this.Tone.Transport.start();
  }

  pause(): void {
    this.Tone?.Transport.pause();
  }

  stop(): void {
    if (!this.Tone) return;
    this.Tone.Transport.stop();
    this.Tone.Transport.position = 0;
    for (const instrument of this.instruments.values()) {
      if ("releaseAll" in instrument && typeof instrument.releaseAll === "function") {
        instrument.releaseAll();
      }
    }
  }

  setVolume(voiceId: string, volume: number): void {
    const mixer = this.mixer.get(voiceId);
    if (!mixer) return;
    mixer.volume = volume;
    this.applyGains();
  }

  setMuted(voiceId: string, muted: boolean): void {
    const mixer = this.mixer.get(voiceId);
    if (!mixer) return;
    mixer.muted = muted;
    this.applyGains();
  }

  setSoloed(voiceId: string, soloed: boolean): void {
    const mixer = this.mixer.get(voiceId);
    if (!mixer) return;
    mixer.soloed = soloed;
    this.applyGains();
  }

  getMixer(voiceId: string): MixerState {
    return this.mixer.get(voiceId) ?? { ...DEFAULT_MIXER };
  }

  private applyGains(): void {
    const anySolo = [...this.mixer.values()].some((m) => m.soloed);
    for (const [voiceId, mixer] of this.mixer) {
      const gain = this.gains.get(voiceId);
      if (gain) gain.gain.value = effectiveGain(mixer, anySolo);
    }
  }

  async dispose(): Promise<void> {
    if (this.Tone) {
      this.Tone.Transport.cancel();
      this.Tone.Transport.stop();
    }
    for (const instrument of this.instruments.values()) {
      instrument.dispose();
    }
    for (const gain of this.gains.values()) {
      gain.dispose();
    }
    this.instruments.clear();
    this.gains.clear();
    this.mixer.clear();
    this.events = [];
    this.duration = 0;
    this.loaded = false;
  }
}
