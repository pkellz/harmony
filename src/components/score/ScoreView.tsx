"use client";

import { useEffect, useRef } from "react";

type OsmdModule = typeof import("opensheetmusicdisplay");
type OsmdInstance = InstanceType<OsmdModule["OpenSheetMusicDisplay"]>;

type ScoreViewProps = {
  xml: string;
  tempoBpm: number;
  position: number;
};

const EPSILON = 1e-6;
const MAX_CURSOR_STEPS = 5000;

export function ScoreView({ xml, tempoBpm, position }: ScoreViewProps) {
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
          { type: CursorType.ThinLeft, color: "#2563eb", alpha: 0.85, follow: true },
        ],
      });
      await display.load(xml);
      if (cancelled) return;
      display.render();
      display.cursor.show();
      osmdRef.current = display;
    })();

    return () => {
      cancelled = true;
      const display = osmdRef.current;
      osmdRef.current = null;
      try {
        display?.clear();
      } catch {
        // OSMD can throw if it never finished loading.
      }
      host.innerHTML = "";
    };
  }, [xml]);

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
  }, [position, tempoBpm]);

  return (
    <div
      ref={hostRef}
      className="min-h-[320px] w-full overflow-x-auto rounded-xl bg-white p-4 text-black"
    />
  );
}
