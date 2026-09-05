#!/usr/bin/env bash
# Day 0 Audiveris spike. Requires Docker.
# Usage: ./scripts/spike-omr.sh [path/to/score.pdf]
set -euo pipefail

export PATH="$HOME/.docker/bin:/Applications/Docker.app/Contents/Resources/bin:$PATH"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PDF="${1:-}"
OUT="$ROOT/fixtures/omr-out"

if [[ -z "$PDF" ]]; then
  echo "No PDF given. Pass a SATB+piano PDF:"
  echo "  ./scripts/spike-omr.sh /path/to/score.pdf"
  echo
  echo "A closed-score LilyPond source is at fixtures/pdf/satb-piano-closed.ly"
  echo
  echo "Inspecting the known-good MusicXML fixture instead (parser target):"
  exec npx tsx --tsconfig "$ROOT/tsconfig.json" "$ROOT/scripts/inspect-voices.ts" \
    "$ROOT/fixtures/musicxml/satb-piano-closed.xml"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker CLI not on PATH. Add ~/.docker/bin and retry."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker daemon is not ready. Open Docker Desktop and wait until it is idle."
  exit 1
fi

mkdir -p "$OUT"
ABS_PDF="$(cd "$(dirname "$PDF")" && pwd)/$(basename "$PDF")"
IMAGE="${HARMONY_AUDIVERIS_IMAGE:-harmony-omr}"

if [[ "$IMAGE" == "harmony-omr" ]]; then
  docker build -t harmony-omr -f "$ROOT/docker/omr.Dockerfile" "$ROOT"
fi

# Worker image entrypoint is the Node poll loop; the spike needs the Audiveris CLI.
docker run --rm \
  --entrypoint Audiveris \
  -v "$ABS_PDF:/data/score.pdf:ro" \
  -v "$OUT:/data/out" \
  "$IMAGE" \
  -batch -export \
  -option org.audiveris.omr.sheet.BookManager.useCompression=false \
  -option org.audiveris.omr.sheet.BookManager.useOpus=false \
  -output /data/out -- /data/score.pdf

echo
echo "Audiveris output in $OUT"
npx tsx --tsconfig "$ROOT/tsconfig.json" "$ROOT/scripts/inspect-voices.ts" "$OUT"
