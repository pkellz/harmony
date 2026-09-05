import { readFile } from "node:fs/promises";
import path from "node:path";
import * as scoresService from "../src/server/scores/scores.service";

const fixture = path.join(
  process.cwd(),
  "fixtures/musicxml/satb-piano-closed.xml",
);

const expectedLabels = [
  "Soprano",
  "Alto",
  "Tenor",
  "Bass",
  "Piano RH",
  "Piano LH",
];

async function waitForReady(id: string, timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const score = await scoresService.getById(id);
    if (score.status === "ready") return score;
    if (score.status === "failed") {
      throw new Error(`Score failed: ${score.error}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Timed out waiting for worker to mark score ready");
}

async function main() {
  const buffer = await readFile(fixture);
  const created = await scoresService.createFromUpload({
    filename: "satb-piano-closed.musicxml",
    buffer,
  });
  console.log(`uploaded ${created.id} status=${created.status}`);
  const ready = await waitForReady(created.id);
  const labels = (ready.voices ?? []).map((v) => v.label);
  console.log("voices:", ready.voices);
  const missing = expectedLabels.filter((label) => !labels.includes(label));
  if (missing.length) {
    throw new Error(`Missing voice labels: ${missing.join(", ")}`);
  }
  const xml = await scoresService.getMusicXml(created.id);
  if (!xml.xml.includes("score-partwise")) {
    throw new Error("MusicXML payload missing score-partwise");
  }
  console.log("e2e ok");
  process.exit(0);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
