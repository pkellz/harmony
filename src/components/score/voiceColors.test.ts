import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { VOICE_COLORS, applyVoiceColors } from "./voiceColors";
import { parseScore } from "@/domain/musicxml/parseScore";

const FIXTURE = path.join(process.cwd(), "fixtures/musicxml/satb-piano-closed.xml");

type ColoredNote = { color: string; midiLike: string };

async function colorFixture() {
  const { OpenSheetMusicDisplay } = await import("opensheetmusicdisplay");
  const xml = readFileSync(FIXTURE, "utf-8");
  const parsed = parseScore(xml);

  const host = document.createElement("div");
  document.body.appendChild(host);
  const display = new OpenSheetMusicDisplay(host, {
    backend: "svg",
    autoResize: false,
  });
  await display.load(xml);
  applyVoiceColors(display, parsed.voices);

  // Collect colored notes grouped by the staff they actually sit on, which is
  // what distinguishes Soprano from Tenor in a closed score.
  const byStaff = new Map<string, ColoredNote[]>();
  for (const instrument of display.Sheet.Instruments) {
    for (const voice of instrument.Voices) {
      for (const entry of voice.VoiceEntries) {
        const staff = entry.ParentSourceStaffEntry?.ParentStaff;
        if (!staff) continue;
        const key = `${instrument.IdString}:${staff.Id}:${voice.VoiceId}`;
        for (const note of entry.Notes) {
          if (!note.Pitch) continue;
          const list = byStaff.get(key) ?? [];
          list.push({
            color: note.NoteheadColor,
            midiLike: `${note.Pitch.FundamentalNote}${note.Pitch.Octave}`,
          });
          byStaff.set(key, list);
        }
      }
    }
  }
  return byStaff;
}

describe("applyVoiceColors", () => {
  it("gives each SATB voice its own distinct color", async () => {
    const byStaff = await colorFixture();

    const expected: Record<string, string> = {
      "P1:1:1": VOICE_COLORS.Soprano,
      "P1:1:2": VOICE_COLORS.Alto,
      "P1:2:1": VOICE_COLORS.Tenor,
      "P1:2:2": VOICE_COLORS.Bass,
    };

    for (const [key, color] of Object.entries(expected)) {
      const notes = byStaff.get(key);
      expect(notes, `no notes found for ${key}`).toBeTruthy();
      expect(notes!.length).toBeGreaterThan(0);
      for (const note of notes!) {
        expect(note.color, `${key} note ${note.midiLike}`).toBe(color);
      }
    }

    // The regression this guards: Soprano/Tenor share a MusicXML voice number,
    // as do Alto/Bass, so a per-Voice implementation collapses to two colors.
    const distinct = new Set(Object.keys(expected).map((k) => byStaff.get(k)![0].color));
    expect(distinct.size).toBe(4);
  });

  it("leaves piano staves uncolored", async () => {
    const byStaff = await colorFixture();
    const satbColors = new Set(Object.values(VOICE_COLORS));
    for (const [key, notes] of byStaff) {
      if (key.startsWith("P1:")) continue;
      for (const note of notes) {
        expect(satbColors.has(note.color)).toBe(false);
      }
    }
  });
});
