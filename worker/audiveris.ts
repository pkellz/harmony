import { spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import JSZip from "jszip";

function audiverisBin(): string {
  return process.env.HARMONY_AUDIVERIS_BIN || "Audiveris";
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkFiles(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function unzipMusicXml(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const xmlName = Object.keys(zip.files).find(
    (name) => name.endsWith(".xml") && !zip.files[name]?.dir,
  );
  if (!xmlName) {
    throw new Error("Compressed MusicXML (.mxl) did not contain a .xml file");
  }
  return zip.files[xmlName]!.async("string");
}

export async function musicXmlFromBuffer(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mxl") || buffer.subarray(0, 2).toString() === "PK") {
    try {
      return await unzipMusicXml(buffer);
    } catch {
      // fall through — might be uncompressed xml despite the extension
    }
  }
  return buffer.toString("utf8");
}

export async function runAudiveris(pdfPath: string): Promise<string> {
  const outDir = await mkdtemp(path.join(os.tmpdir(), "harmony-omr-"));
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        audiverisBin(),
        [
          "-batch",
          "-export",
          "-option",
          "org.audiveris.omr.sheet.BookManager.useCompression=false",
          "-option",
          "org.audiveris.omr.sheet.BookManager.useOpus=false",
          "-output",
          outDir,
          "--",
          pdfPath,
        ],
        { stdio: ["ignore", "pipe", "pipe"] },
      );
      let stderr = "";
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      child.on("error", (err) => {
        reject(
          new Error(
            `Failed to spawn Audiveris (${audiverisBin()}): ${err.message}`,
          ),
        );
      });
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Audiveris exited ${code}: ${stderr.slice(-2000)}`));
      });
    });

    const files = await walkFiles(outDir);
    const xmlFile = files.find((file) => file.endsWith(".xml"));
    const mxlFile = files.find((file) => file.endsWith(".mxl"));
    if (xmlFile) return readFile(xmlFile, "utf8");
    if (mxlFile) return unzipMusicXml(await readFile(mxlFile));
    throw new Error("Audiveris produced no MusicXML export");
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}
