import connectToDatabase from "@/services/Database";
import ScoreModel, {
  type IScore,
  type ScoreStatus,
  type ScoreVoice,
} from "@/types/mongoose/Score";
import type { HydratedDocument } from "mongoose";

export type ScoreDoc = HydratedDocument<IScore>;

export type ScoreListItem = {
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

export function toListItem(doc: IScore): ScoreListItem {
  return {
    id: String(doc._id),
    title: doc.title,
    originalFilename: doc.originalFilename,
    sourceKind: doc.sourceKind,
    status: doc.status,
    error: doc.error,
    omrDurationMs: doc.omrDurationMs,
    tempoBpm: doc.tempoBpm,
    voices: doc.voices,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    updatedAt:
      doc.updatedAt instanceof Date
        ? doc.updatedAt.toISOString()
        : String(doc.updatedAt),
  };
}

export async function create(data: {
  title: string;
  originalFilename: string;
  sourceKind: "pdf" | "musicxml";
  pdfBlobPath: string;
  status: ScoreStatus;
}): Promise<ScoreDoc> {
  await connectToDatabase();
  return ScoreModel.create(data);
}

export async function findById(id: string): Promise<ScoreDoc | null> {
  await connectToDatabase();
  return ScoreModel.findById(id);
}

export async function listRecent(limit = 50): Promise<ScoreDoc[]> {
  await connectToDatabase();
  return ScoreModel.find().sort({ createdAt: -1 }).limit(limit);
}

export async function claimNextUploaded(): Promise<ScoreDoc | null> {
  await connectToDatabase();
  return ScoreModel.findOneAndUpdate(
    { status: "uploaded" },
    { status: "converting" },
    { sort: { createdAt: 1 }, new: true },
  );
}

export async function markReady(
  id: string,
  data: {
    musicXmlBlobPath: string;
    voices: ScoreVoice[];
    tempoBpm: number;
    omrDurationMs: number;
  },
): Promise<void> {
  await connectToDatabase();
  await ScoreModel.updateOne(
    { _id: id },
    {
      status: "ready",
      musicXmlBlobPath: data.musicXmlBlobPath,
      voices: data.voices,
      tempoBpm: data.tempoBpm,
      omrDurationMs: data.omrDurationMs,
      error: undefined,
    },
  );
}

export async function markFailed(id: string, error: string): Promise<void> {
  await connectToDatabase();
  await ScoreModel.updateOne({ _id: id }, { status: "failed", error });
}
