"use client";

import { useEffect, useRef } from "react";

type ScoreViewProps = {
  xml: string;
};

export function ScoreView({ xml }: ScoreViewProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !xml) return;
    let cancelled = false;
    let osmd: { clear: () => void } | undefined;

    void (async () => {
      const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
      if (cancelled || !hostRef.current) return;
      hostRef.current.innerHTML = "";
      const display = new OpenSheetMusicDisplay(hostRef.current, {
        autoResize: true,
        backend: "svg",
        drawTitle: true,
      });
      osmd = display;
      await display.load(xml);
      if (cancelled) return;
      display.render();
    })();

    return () => {
      cancelled = true;
      try {
        osmd?.clear();
      } catch {
        // OSMD can throw if it never finished loading.
      }
      host.innerHTML = "";
    };
  }, [xml]);

  return (
    <div
      ref={hostRef}
      className="min-h-[320px] w-full overflow-x-auto rounded-xl bg-white p-4 text-black"
    />
  );
}
