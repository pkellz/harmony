export type VoiceStream = {
  id: string;
  partId: string;
  partName?: string;
  staff: number;
  voice: number;
  noteCount: number;
};

export type LabeledVoice = VoiceStream & { label: string };

function voiceNumbersOnStaff(
  streams: VoiceStream[],
  partId: string,
  staff: number,
): number[] {
  return [
    ...new Set(
      streams
        .filter((s) => s.partId === partId && s.staff === staff)
        .map((s) => s.voice),
    ),
  ].sort((a, b) => a - b);
}

function satbLabel(staff: number, voiceRank: number): string | undefined {
  if (staff === 1 && voiceRank === 0) return "Soprano";
  if (staff === 1 && voiceRank === 1) return "Alto";
  if (staff === 1) return `Treble v${voiceRank + 1}`;
  if (staff === 2 && voiceRank === 0) return "Tenor";
  if (staff === 2 && voiceRank === 1) return "Bass";
  if (staff === 2) return `Bass v${voiceRank + 1}`;
  return undefined;
}

function pianoLabel(staff: number, voice: number, multiVoice: boolean): string {
  const hand = (staff - 1) % 2 === 0 ? "Piano RH" : "Piano LH";
  return multiVoice ? `${hand} v${voice}` : hand;
}

function labelChoirPart(streams: VoiceStream[], partId: string): Map<string, string> {
  const labels = new Map<string, string>();
  const staves = [
    ...new Set(streams.filter((s) => s.partId === partId).map((s) => s.staff)),
  ].sort((a, b) => a - b);

  const choirStaves = staves.length >= 4 ? staves.slice(0, 2) : staves.slice(0, 2);
  const pianoStaves = staves.length >= 4 ? staves.slice(2) : [];

  for (const staff of choirStaves) {
    const voices = voiceNumbersOnStaff(streams, partId, staff);
    voices.forEach((voice, rank) => {
      const stream = streams.find(
        (s) => s.partId === partId && s.staff === staff && s.voice === voice,
      );
      if (!stream) return;
      labels.set(stream.id, satbLabel(staff, rank) ?? `Staff ${staff} v${voice}`);
    });
  }

  for (const staff of pianoStaves) {
    const voices = voiceNumbersOnStaff(streams, partId, staff);
    voices.forEach((voice) => {
      const stream = streams.find(
        (s) => s.partId === partId && s.staff === staff && s.voice === voice,
      );
      if (!stream) return;
      labels.set(stream.id, pianoLabel(staff, voice, voices.length > 1));
    });
  }

  return labels;
}

/**
 * Heuristic SATB / piano labels. Closed-score choir is assumed to live on the
 * first 2-staff part (or the first four staves of a single part). Remaining
 * streams are Piano. Raw staff/voice IDs stay on the stream for the mixer UI.
 */
export function identifyVoices(streams: VoiceStream[]): LabeledVoice[] {
  if (streams.length === 0) return [];

  const partIds = [...new Set(streams.map((s) => s.partId))];
  const labels = new Map<string, string>();

  const choirPart =
    partIds.find((partId) => {
      const staves = [
        ...new Set(streams.filter((s) => s.partId === partId).map((s) => s.staff)),
      ];
      return staves.length >= 2;
    }) ?? partIds[0];

  for (const [id, label] of labelChoirPart(streams, choirPart)) {
    labels.set(id, label);
  }

  for (const stream of streams) {
    if (labels.has(stream.id)) continue;
    const voices = voiceNumbersOnStaff(streams, stream.partId, stream.staff);
    labels.set(
      stream.id,
      pianoLabel(stream.staff, stream.voice, voices.length > 1),
    );
  }

  return streams.map((stream) => ({
    ...stream,
    label: labels.get(stream.id) ?? `Staff ${stream.staff} v${stream.voice}`,
  }));
}
