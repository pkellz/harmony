import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parseScore } from "../src/domain/musicxml/parseScore";

function collectXmlFiles(target: string): string[] {
  const abs = path.resolve(target);
  const stats = statSync(abs);
  if (stats.isFile()) return [abs];
  return readdirSync(abs)
    .filter((name) => name.endsWith(".xml") || name.endsWith(".musicxml"))
    .map((name) => path.join(abs, name));
}

const target = process.argv[2] ?? "fixtures/musicxml";
const files = collectXmlFiles(target);

if (files.length === 0) {
  console.error(`No MusicXML files in ${target}`);
  process.exit(1);
}

for (const file of files) {
  const parsed = parseScore(readFileSync(file, "utf8"));
  console.log(`\n${path.relative(process.cwd(), file)}`);
  console.log(`  title: ${parsed.title}`);
  console.log(`  tempo: ${parsed.tempoBpm} bpm`);
  console.log("  voices:");
  for (const voice of parsed.voices) {
    console.log(
      `    ${voice.label.padEnd(12)} ${voice.id}  notes=${voice.noteCount}` +
        (voice.partName ? `  part="${voice.partName}"` : ""),
    );
  }
}
