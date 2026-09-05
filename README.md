# Harmony

Practice SATB vocal lines from a piece of sheet music. Upload a PDF (OMR via Audiveris) or MusicXML, then solo / mute / mix each voice.

## Day 0 spike

Audiveris is the risk: it often collapses two voices that share a staff. This machine did not have Docker or a JRE, so the spike inspected a known closed-score SATB + piano MusicXML fixture instead of running OMR on PDFs.

Expected `(part, staff, voice)` pairs — **six**, with soprano and alto distinct:

```
P1 staff=1 voice=1  Soprano
P1 staff=1 voice=2  Alto
P1 staff=2 voice=1  Tenor
P1 staff=2 voice=2  Bass
P2 staff=1 voice=1  Piano RH
P2 staff=2 voice=1  Piano LH
```

When Docker is available, run the real OMR spike against 2–3 of your PDFs:

```bash
./scripts/spike-omr.sh /path/to/score.pdf
```

If soprano and alto collapse into one voice in that output, stop and switch the ingest path to MusicXML-first. PlayScore 2 is a useful oracle for the same PDF.

## Local MVP (no Docker)

MongoDB is expected at `mongodb://127.0.0.1:27017/harmony`. Blobs default to `.data/blobs` when Azure env vars are unset.

```bash
cp .env.sample .env.local   # local mongo + filesystem blobs
npm install
npm run test:ci
npm run dev                 # http://localhost:3000
npm run worker              # separate terminal
npm run e2e:fixture         # upload fixture, wait for worker, assert SATB labels
```

Upload `fixtures/musicxml/satb-piano-closed.xml` on the home page. The worker skips Audiveris for MusicXML and marks the score `ready`. Open the score, wait for the mixer, then Play / Mute / Solo each SATB line.

Or seed the same fixture from the CLI:

```bash
npm run seed
npm run worker
```

## PDF + Audiveris

PDF uploads need the OMR worker image (Java 21 + Audiveris + Tesseract + Node):

```bash
docker compose up --build
```

Point the Next.js app at the compose Mongo/Azurite endpoints (see `.env.sample`). The worker claims `status: uploaded` rows, runs `Audiveris -batch -export`, stores MusicXML, and writes voice metadata.

## Stack

- Next.js App Router, TypeScript, Tailwind, shadcn/ui
- MongoDB / Mongoose
- Azure Blob Storage (Azurite in compose; filesystem fallback locally)
- OpenSheetMusicDisplay for notation
- Tone.js scheduler with one gain node per `(part, staff, voice)`

## Cut from v0

Cursor-follow, repeats, lyrics, tempo control, looping, transposition, count-in, pitch feedback, auth.
