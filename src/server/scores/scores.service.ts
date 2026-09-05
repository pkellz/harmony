import { randomUUID } from "node:crypto";
import { AppError } from "@/server/http/appError";
import * as blob from "@/services/BlobStorage";
import * as scoresRepository from "./scores.repository";
import type { ScoreListItem } from "./scores.repository";

const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

const PDF_MAGIC = Buffer.from("%PDF");

function looksLikePdf(buffer: Buffer, filename: string): boolean {
  return (
    filename.toLowerCase().endsWith(".pdf") || buffer.subarray(0, 4).equals(PDF_MAGIC)
  );
}

function looksLikeMusicXml(buffer: Buffer, filename: string): boolean {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".xml") || lower.endsWith(".musicxml") || lower.endsWith(".mxl")) {
    return true;
  }
  const head = buffer.subarray(0, 256).toString("utf8");
  return head.includes("score-partwise") || head.includes("score-timewise");
}

function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled score";
}

export async function createFromUpload(input: {
  filename: string;
  buffer: Buffer;
}): Promise<ScoreListItem> {
  if (input.buffer.byteLength === 0) {
    throw new AppError(400, "Empty file");
  }
  if (input.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new AppError(400, "File too large (max 40MB)");
  }

  const isPdf = looksLikePdf(input.buffer, input.filename);
  const isXml = looksLikeMusicXml(input.buffer, input.filename);
  if (!isPdf && !isXml) {
    throw new AppError(400, "Upload a PDF or MusicXML file");
  }

  const sourceKind = isPdf ? "pdf" : "musicxml";
  const id = randomUUID();
  const ext = isPdf ? "pdf" : input.filename.toLowerCase().endsWith(".mxl") ? "mxl" : "xml";
  const blobPath = `${id}/source.${ext}`;
  const contentType = isPdf
    ? "application/pdf"
    : ext === "mxl"
      ? "application/vnd.recordare.musicxml"
      : "application/vnd.recordare.musicxml+xml";

  await blob.ensureContainerExists();
  await blob.uploadBuffer(blobPath, input.buffer, contentType);

  const doc = await scoresRepository.create({
    title: titleFromFilename(input.filename),
    originalFilename: input.filename,
    sourceKind,
    pdfBlobPath: blobPath,
    status: "uploaded",
  });
  return scoresRepository.toListItem(doc);
}

export async function list(): Promise<{ items: ScoreListItem[] }> {
  const docs = await scoresRepository.listRecent();
  return { items: docs.map(scoresRepository.toListItem) };
}

export async function getById(id: string): Promise<ScoreListItem> {
  const doc = await scoresRepository.findById(id);
  if (!doc) throw new AppError(404, "Score not found");
  return scoresRepository.toListItem(doc);
}

export async function getMusicXml(id: string): Promise<{
  xml: string;
  filename: string;
}> {
  const doc = await scoresRepository.findById(id);
  if (!doc) throw new AppError(404, "Score not found");
  if (doc.status !== "ready" || !doc.musicXmlBlobPath) {
    throw new AppError(409, "Score is not ready yet", { code: "NOT_READY" });
  }
  const buffer = await blob.downloadBuffer(doc.musicXmlBlobPath);
  return { xml: buffer.toString("utf8"), filename: `${doc.title}.musicxml` };
}
