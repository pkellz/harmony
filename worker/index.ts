import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseScore } from "../src/domain/musicxml/parseScore";
import * as scoresRepository from "../src/server/scores/scores.repository";
import * as blob from "../src/services/BlobStorage";
import { logger } from "../src/services/Logger";
import { musicXmlFromBuffer, runAudiveris } from "./audiveris";

const pollMs = Number(process.env.HARMONY_WORKER_POLL_MS || 3000);

async function processOne(): Promise<boolean> {
  const score = await scoresRepository.claimNextUploaded();
  if (!score) return false;

  const started = Date.now();
  const id = String(score._id);
  logger.info("omr.claimed", { id, sourceKind: score.sourceKind });

  try {
    const source = await blob.downloadBuffer(score.pdfBlobPath);
    let xml: string;
    if (score.sourceKind === "musicxml") {
      xml = await musicXmlFromBuffer(source, score.originalFilename);
    } else {
      const pdfPath = path.join(os.tmpdir(), `${id}.pdf`);
      await writeFile(pdfPath, source);
      xml = await runAudiveris(pdfPath);
    }

    const parsed = parseScore(xml);
    const musicXmlBlobPath = `${id}/score.musicxml`;
    await blob.uploadBuffer(
      musicXmlBlobPath,
      Buffer.from(xml, "utf8"),
      "application/vnd.recordare.musicxml+xml",
    );
    await scoresRepository.markReady(id, {
      musicXmlBlobPath,
      voices: parsed.voices,
      tempoBpm: parsed.tempoBpm,
      omrDurationMs: Date.now() - started,
    });
    logger.info("omr.ready", {
      id,
      voices: parsed.voices.length,
      omrDurationMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("omr.failed", { id, err });
    await scoresRepository.markFailed(id, message);
  }

  return true;
}

async function loop(): Promise<void> {
  logger.info("omr.worker.start", { pollMs });
  for (;;) {
    try {
      const worked = await processOne();
      if (!worked) {
        await new Promise((resolve) => setTimeout(resolve, pollMs));
      }
    } catch (err) {
      logger.error("omr.worker.tick_failed", { err });
      await new Promise((resolve) => setTimeout(resolve, pollMs));
    }
  }
}

void loop();
