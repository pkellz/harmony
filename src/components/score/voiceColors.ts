import { voiceId } from "@/domain/musicxml/parseScore";
import type { ScoreVoice } from "@/lib/scoreTypes";

type OsmdModule = typeof import("opensheetmusicdisplay");
type OsmdInstance = InstanceType<OsmdModule["OpenSheetMusicDisplay"]>;

/** Notehead/stem color per SATB voice label. Labels come from identifyVoices. */
export const VOICE_COLORS: Record<string, string> = {
  Soprano: "#dc2626",
  Alto: "#2563eb",
  Tenor: "#ca8a04",
  Bass: "#16a34a",
};

/**
 * Color each SATB line in the rendered score. Call after load() and before
 * render(). Voices without a color (piano staves) are left untouched.
 */
export function applyVoiceColors(
  display: OsmdInstance,
  voices: ScoreVoice[] | undefined,
): void {
  if (!voices || voices.length === 0) return;

  const colorById = new Map<string, string>();
  for (const voice of voices) {
    const color = VOICE_COLORS[voice.label];
    if (color) colorById.set(voice.id, color);
  }
  if (colorById.size === 0) return;

  const partIdsInOrder = [...new Set(voices.map((v) => v.partId))];

  // A closed SATB score puts two voices on each staff, and MusicXML numbers
  // voices per part rather than per staff: voice 1 is Soprano on staff 1 and
  // Tenor on staff 2, voice 2 is Alto and then Bass. OSMD models a Voice per
  // instrument, so a single Voice object spans both staves and cannot carry one
  // color. Resolve the color per VoiceEntry instead — each entry belongs to
  // exactly one staff, which is what separates Soprano from Tenor here.
  display.Sheet.Instruments.forEach((instrument, instrumentIndex) => {
    const fallbackPartId = partIdsInOrder[instrumentIndex];
    for (const voice of instrument.Voices) {
      for (const entry of voice.VoiceEntries) {
        const staff = entry.ParentSourceStaffEntry?.ParentStaff;
        if (!staff) continue;
        const color =
          colorById.get(voiceId(instrument.IdString, staff.Id, voice.VoiceId)) ??
          (fallbackPartId
            ? colorById.get(voiceId(fallbackPartId, staff.Id, voice.VoiceId))
            : undefined);
        if (!color) continue;
        entry.StemColor = color;
        for (const note of entry.Notes) {
          note.NoteheadColor = color;
        }
      }
    }
  });
}
