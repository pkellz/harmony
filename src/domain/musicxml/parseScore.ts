import { DOMParser as NodeDOMParser } from "@xmldom/xmldom";
import { identifyVoices, type LabeledVoice, type VoiceStream } from "./identifyVoices";

export type NoteEvent = {
  voiceId: string;
  midi: number;
  step: string;
  alter: number;
  octave: number;
  startQuarter: number;
  durationQuarter: number;
  measure: number;
};

export type ParsedScore = {
  title: string;
  tempoBpm: number;
  voices: LabeledVoice[];
  events: NoteEvent[];
};

const STEP_TO_PC: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function isElement(node: Node): node is Element {
  return node.nodeType === 1;
}

function localName(el: Element): string {
  return (el.localName || el.tagName || "").replace(/^.*:/, "");
}

function childElements(el: Element): Element[] {
  return Array.from(el.childNodes).filter(isElement);
}

function childrenNamed(el: Element, name: string): Element[] {
  return childElements(el).filter((child) => localName(child) === name);
}

function firstChildNamed(el: Element, name: string): Element | undefined {
  return childrenNamed(el, name)[0];
}

function textContent(el: Element | undefined): string {
  return (el?.textContent ?? "").trim();
}

function intContent(el: Element | undefined, fallback: number): number {
  const n = Number(textContent(el));
  return Number.isFinite(n) ? n : fallback;
}

function hasChild(el: Element, name: string): boolean {
  return childrenNamed(el, name).length > 0;
}

function parseXml(xml: string): Document {
  return new NodeDOMParser().parseFromString(xml, "text/xml");
}

export function midiFromPitch(step: string, alter: number, octave: number): number {
  const pc = STEP_TO_PC[step.toUpperCase()];
  if (pc === undefined) {
    throw new Error(`Unknown pitch step: ${step}`);
  }
  return (octave + 1) * 12 + pc + alter;
}

export function voiceId(partId: string, staff: number, voice: number): string {
  return `${partId}:${staff}:${voice}`;
}

type OpenTie = { event: NoteEvent };

function ticksToQuarters(ticks: number, divisions: number): number {
  return ticks / Math.max(divisions, 1);
}

function ingestNote(
  note: Element,
  ctx: {
    partId: string;
    partName?: string;
    measureNumber: number;
    cursorTicks: number;
    lastDurationTicks: number;
    measureStartQuarter: number;
    divisions: number;
    events: NoteEvent[];
    openTies: Map<string, OpenTie>;
    streams: Map<string, VoiceStream>;
  },
): { advanceTicks: number } {
  if (hasChild(note, "grace")) {
    return { advanceTicks: 0 };
  }

  const isChord = hasChild(note, "chord");
  const isRest = hasChild(note, "rest");
  const durationTicks = intContent(firstChildNamed(note, "duration"), 0);
  const staff = intContent(firstChildNamed(note, "staff"), 1);
  const voice = intContent(firstChildNamed(note, "voice"), 1);
  const advanceTicks = isChord ? 0 : durationTicks;

  if (isRest) {
    return { advanceTicks };
  }

  const pitch = firstChildNamed(note, "pitch");
  if (!pitch) return { advanceTicks };

  const step = textContent(firstChildNamed(pitch, "step")) || "C";
  const alter = intContent(firstChildNamed(pitch, "alter"), 0);
  const octave = intContent(firstChildNamed(pitch, "octave"), 4);
  const midi = midiFromPitch(step, alter, octave);
  const id = voiceId(ctx.partId, staff, voice);

  const existing = ctx.streams.get(id);
  if (existing) {
    existing.noteCount += 1;
  } else {
    ctx.streams.set(id, {
      id,
      partId: ctx.partId,
      partName: ctx.partName,
      staff,
      voice,
      noteCount: 1,
    });
  }

  const notations = firstChildNamed(note, "notations");
  const tiedEls = notations ? childrenNamed(notations, "tied") : [];
  const tieEls = childrenNamed(note, "tie");
  const startsTie =
    tiedEls.some((el) => el.getAttribute("type") === "start") ||
    tieEls.some((el) => el.getAttribute("type") === "start");
  const stopsTie =
    tiedEls.some((el) => el.getAttribute("type") === "stop") ||
    tieEls.some((el) => el.getAttribute("type") === "stop");

  const durationQuarter = ticksToQuarters(durationTicks, ctx.divisions);
  const startTicks = isChord
    ? Math.max(ctx.cursorTicks - ctx.lastDurationTicks, 0)
    : ctx.cursorTicks;
  const startQuarter =
    ctx.measureStartQuarter + ticksToQuarters(startTicks, ctx.divisions);
  const tieKey = `${id}:${midi}`;

  if (stopsTie) {
    const open = ctx.openTies.get(tieKey);
    if (open) {
      open.event.durationQuarter += durationQuarter;
      if (!startsTie) ctx.openTies.delete(tieKey);
      return { advanceTicks };
    }
  }

  const event: NoteEvent = {
    voiceId: id,
    midi,
    step,
    alter,
    octave,
    startQuarter,
    durationQuarter,
    measure: ctx.measureNumber,
  };
  ctx.events.push(event);
  if (startsTie) ctx.openTies.set(tieKey, { event });
  return { advanceTicks };
}

function readTempo(el: Element, current: number): number {
  if (localName(el) === "sound") {
    const tempo = Number(el.getAttribute("tempo"));
    if (Number.isFinite(tempo) && tempo > 0) return tempo;
  }
  const sound = firstChildNamed(el, "sound");
  if (sound) {
    const tempo = Number(sound.getAttribute("tempo"));
    if (Number.isFinite(tempo) && tempo > 0) return tempo;
  }
  const metronome = firstChildNamed(el, "metronome");
  if (metronome) {
    const perMinute = Number(textContent(firstChildNamed(metronome, "per-minute")));
    if (Number.isFinite(perMinute) && perMinute > 0) return perMinute;
  }
  const directionType = firstChildNamed(el, "direction-type");
  if (directionType) {
    return readTempo(directionType, current);
  }
  return current;
}

export function parseScore(xml: string): ParsedScore {
  const doc = parseXml(xml);
  const root = Array.from(doc.getElementsByTagName("*")).find(
    (el) => localName(el as Element) === "score-partwise",
  ) as Element | undefined;

  if (!root) {
    throw new Error("Not a partwise MusicXML score");
  }

  const work = firstChildNamed(root, "work");
  const workTitle = textContent(work ? firstChildNamed(work, "work-title") : undefined);
  const movementTitle = textContent(firstChildNamed(root, "movement-title"));
  const title = workTitle || movementTitle || "Untitled score";

  const partNames = new Map<string, string>();
  const partList = firstChildNamed(root, "part-list");
  if (partList) {
    for (const scorePart of childrenNamed(partList, "score-part")) {
      const id = scorePart.getAttribute("id") || "";
      partNames.set(id, textContent(firstChildNamed(scorePart, "part-name")));
    }
  }

  const events: NoteEvent[] = [];
  const streams = new Map<string, VoiceStream>();
  let tempoBpm = 120;

  const parts = childrenNamed(root, "part");
  for (const [partIndex, part] of parts.entries()) {
    const partId = part.getAttribute("id") || `P${partIndex + 1}`;
    const partName = partNames.get(partId) || undefined;
    let divisions = 1;
    let measureStartQuarter = 0;
    const openTies = new Map<string, OpenTie>();

    for (const measure of childrenNamed(part, "measure")) {
      const measureNumber = Number(measure.getAttribute("number") ?? "0") || 0;
      let cursorTicks = 0;
      let maxTicks = 0;
      let lastDurationTicks = 0;

      for (const el of childElements(measure)) {
        const name = localName(el);
        if (name === "attributes") {
          const d = intContent(firstChildNamed(el, "divisions"), 0);
          if (d > 0) divisions = d;
        } else if (name === "backup") {
          cursorTicks -= intContent(firstChildNamed(el, "duration"), 0);
          if (cursorTicks < 0) cursorTicks = 0;
          lastDurationTicks = 0;
        } else if (name === "forward") {
          cursorTicks += intContent(firstChildNamed(el, "duration"), 0);
        } else if (name === "note") {
          const { advanceTicks } = ingestNote(el, {
            partId,
            partName,
            measureNumber,
            cursorTicks,
            lastDurationTicks,
            measureStartQuarter,
            divisions,
            events,
            openTies,
            streams,
          });
          if (advanceTicks > 0) lastDurationTicks = advanceTicks;
          cursorTicks += advanceTicks;
        } else if (name === "direction" || name === "sound") {
          tempoBpm = readTempo(el, tempoBpm);
        }
        if (cursorTicks > maxTicks) maxTicks = cursorTicks;
      }

      measureStartQuarter += ticksToQuarters(maxTicks, divisions);
    }
  }

  const voices = identifyVoices([...streams.values()]);

  return {
    title,
    tempoBpm,
    voices,
    events: events.sort((a, b) => a.startQuarter - b.startQuarter),
  };
}
