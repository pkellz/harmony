export type ScoreStatus = "uploaded" | "converting" | "ready" | "failed";

export type ScoreVoice = {
  id: string;
  partId: string;
  partName?: string;
  staff: number;
  voice: number;
  label: string;
  noteCount: number;
};

export type ScoreSummary = {
  id: string;
  title: string;
  originalFilename: string;
  sourceKind: "pdf" | "musicxml";
  status: ScoreStatus;
  error?: string;
  omrDurationMs?: number;
  tempoBpm?: number;
  voices?: ScoreVoice[];
  createdAt: string;
  updatedAt: string;
};
