"use client";

import { useEffect, useRef } from "react";
import type { ScoreVoice } from "@/lib/scoreTypes";
import { voiceId } from "@/domain/musicxml/parseScore";

type OsmdModule = typeof import("opensheetmusicdisplay");
type OsmdInstance = InstanceType<OsmdModule["OpenSheetMusicDisplay"]>;
type OsmdCursor = OsmdInstance["cursor"];

type ScoreViewProps = {
  xml: string;
  tempoBpm: number;
  position: number;
  voices?: ScoreVoice[];
};

const EPSILON = 1e-6;
const MAX_CURSOR_STEPS = 5000;
const CURSOR_COLOR = "#2563eb";
const CURSOR_ALPHA = 0.85;

const VOICE_COLORS: Record<string, string> = {
  Soprano: "#dc2626",
  Alto: "#2563eb",
  Tenor: "#ca8a04",
  Bass: "#16a34a",
};

function applyVoiceColors(display: OsmdInstance, voices: ScoreVoice[] | undefined): void {
  if (!voices || voices.length === 0) return;

  const colorById = new Map<string, string>();
  for (const voice of voices) {
    const color = VOICE_COLORS[voice.label];
    if (color) colorById.set(voice.id, color);
  }
  if (colorById.size === 0) return;

  const partIdsInOrder = [...new Set(voices.map((v) => v.partId))];

  display.Sheet.Instruments.forEach((instrument, instrumentIndex) => {
    const fallbackPartId = partIdsInOrder[instrumentIndex];
    for (const staff of instrument.Staves) {
      for (const voice of staff.Voices) {
        const color =
          colorById.get(voiceId(instrument.IdString, staff.Id, voice.VoiceId)) ??
          (fallbackPartId
            ? colorById.get(voiceId(fallbackPartId, staff.Id, voice.VoiceId))
            : undefined);
        if (!color) continue;
        for (const entry of voice.VoiceEntries) {
          entry.StemColor = color;
          for (const note of entry.Notes) {
            note.NoteheadColor = color;
          }
        }
      }
    }
  });
}

// OSMD's cursor bitmap renders at a near-zero size for this content (its own
// width/height calculation degenerates) and defaults to a negative z-index, so
// it's invisible unless sized and layered explicitly. OSMD's own autoResize
// re-render also recreates/resets the element, so this must be reapplied on
// every cursor update rather than once after load.
function styleCursorElement(cursor: OsmdCursor): void {
  const el = cursor.cursorElement;
  el.style.width = "3px";
  el.style.height = "140px";
  el.style.backgroundColor = CURSOR_COLOR;
  el.style.opacity = String(CURSOR_ALPHA);
  el.style.zIndex = "5";
}

export function ScoreView({ xml, tempoBpm, position, voices }: ScoreViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const osmdRef = useRef<OsmdInstance | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !xml) return;
    let cancelled = false;

    void (async () => {
      const { OpenSheetMusicDisplay, CursorType } = await import("opensheetmusicdisplay");
      if (cancelled || !hostRef.current) return;
      hostRef.current.innerHTML = "";
      const display = new OpenSheetMusicDisplay(hostRef.current, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
        cursorsOptions: [
          { type: CursorType.ThinLeft, color: CURSOR_COLOR, alpha: CURSOR_ALPHA, follow: true },
        ],
      });
      await display.load(xml);
      if (cancelled) return;
      applyVoiceColors(display, voices);
      display.render();
      display.cursor.show();
      styleCursorElement(display.cursor);
      osmdRef.current = display;
    })();

    // autoResize can trigger internal re-renders at unpredictable times, which
    // recreate the cursor element and drop the styling above. Keep reasserting
    // it for the component's lifetime rather than trying to catch each reset.
    const restyleInterval = window.setInterval(() => {
      const display = osmdRef.current;
      if (display) styleCursorElement(display.cursor);
    }, 300);

    return () => {
      cancelled = true;
      window.clearInterval(restyleInterval);
      const display = osmdRef.current;
      osmdRef.current = null;
      try {
        display?.clear();
      } catch {
        // OSMD can throw if it never finished loading.
      }
      host.innerHTML = "";
    };
  }, [xml, voices]);

  useEffect(() => {
    const cursor = osmdRef.current?.cursor;
    if (!cursor) return;
    const secondsPerQuarter = 60 / tempoBpm;
    const targetWholeNotes = position / secondsPerQuarter / 4;

    if (targetWholeNotes < cursor.iterator.currentTimeStamp.RealValue - EPSILON) {
      cursor.reset();
    }

    let steps = 0;
    while (
      !cursor.iterator.EndReached &&
      cursor.iterator.currentTimeStamp.RealValue < targetWholeNotes - EPSILON &&
      steps < MAX_CURSOR_STEPS
    ) {
      cursor.next();
      steps++;
    }
    styleCursorElement(cursor);
  }, [position, tempoBpm]);

  return (
    <div
      ref={hostRef}
      className="relative min-h-[320px] w-full overflow-x-auto rounded-xl bg-white p-4 text-black"
    />
  );
}
