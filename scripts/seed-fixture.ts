import { readFile } from "node:fs/promises";
import path from "node:path";
import * as scoresService from "../src/server/scores/scores.service";

const fixture = path.join(
  process.cwd(),
  "fixtures/musicxml/satb-piano-closed.xml",
);

async function main() {
  const buffer = await readFile(fixture);
  const score = await scoresService.createFromUpload({
    filename: "satb-piano-closed.musicxml",
    buffer,
  });
  console.log(`Seeded score ${score.id} (${score.status}). Start the worker:`);
  console.log("  npm run worker");
  process.exit(0);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
