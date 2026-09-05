import mongoose from "mongoose";

export const SCORE_STATUSES = [
  "uploaded",
  "converting",
  "ready",
  "failed",
] as const;

export type ScoreStatus = (typeof SCORE_STATUSES)[number];

export type ScoreVoice = {
  id: string;
  partId: string;
  partName?: string;
  staff: number;
  voice: number;
  label: string;
  noteCount: number;
};

export interface IScore {
  _id: mongoose.Types.ObjectId | string;
  title: string;
  originalFilename: string;
  sourceKind: "pdf" | "musicxml";
  pdfBlobPath: string;
  musicXmlBlobPath?: string;
  status: ScoreStatus;
  error?: string;
  omrDurationMs?: number;
  tempoBpm?: number;
  voices?: ScoreVoice[];
  createdAt: Date;
  updatedAt: Date;
}

const ScoreSchema = new mongoose.Schema<IScore>(
  {
    title: { type: String, required: true },
    originalFilename: { type: String, required: true },
    sourceKind: { type: String, enum: ["pdf", "musicxml"], required: true },
    pdfBlobPath: { type: String, required: true },
    musicXmlBlobPath: { type: String },
    status: {
      type: String,
      enum: SCORE_STATUSES,
      default: "uploaded",
      index: true,
    },
    error: { type: String },
    omrDurationMs: { type: Number },
    tempoBpm: { type: Number },
    voices: [
      {
        id: { type: String, required: true },
        partId: { type: String, required: true },
        partName: { type: String },
        staff: { type: Number, required: true },
        voice: { type: Number, required: true },
        label: { type: String, required: true },
        noteCount: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.models.Score ||
  mongoose.model<IScore>("Score", ScoreSchema);
