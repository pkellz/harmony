import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { identifyVoices } from "./identifyVoices";
import { parseScore, voiceId } from "./parseScore";

const fixturePath = path.join(
  process.cwd(),
  "fixtures/musicxml/satb-piano-closed.xml",
);

function loadFixture(): string {
  return readFileSync(fixturePath, "utf8");
}

describe("parseScore", () => {
  it("separates SATB voices on a closed score plus piano staves", () => {
    const parsed = parseScore(loadFixture());
    const ids = parsed.voices.map((v) => v.id).sort();
    expect(ids).toEqual([
      "P1:1:1",
      "P1:1:2",
      "P1:2:1",
      "P1:2:2",
      "P2:1:1",
      "P2:2:1",
    ]);
    expect(parsed.tempoBpm).toBe(90);
    expect(parsed.title).toMatch(/SATB/i);
  });

  it("labels choir SATB and remaining streams as piano", () => {
    const parsed = parseScore(loadFixture());
    const byId = Object.fromEntries(parsed.voices.map((v) => [v.id, v.label]));
    expect(byId["P1:1:1"]).toBe("Soprano");
    expect(byId["P1:1:2"]).toBe("Alto");
    expect(byId["P1:2:1"]).toBe("Tenor");
    expect(byId["P1:2:2"]).toBe("Bass");
    expect(byId["P2:1:1"]).toBe("Piano RH");
    expect(byId["P2:2:1"]).toBe("Piano LH");
  });

  it("extends tied notes instead of emitting a second attack", () => {
    const parsed = parseScore(loadFixture());
    const soprano = parsed.events.filter((e) => e.voiceId === voiceId("P1", 1, 1));
    const first = soprano[0];
    expect(first?.step).toBe("G");
    expect(first?.octave).toBe(4);
    // whole + tied half at 90bpm, divisions=2 → 8+4 ticks = 6 quarters
    expect(first?.durationQuarter).toBe(6);
    expect(first?.startQuarter).toBe(0);
  });

  it("uses written duration for dotted notes and skips rests", () => {
    const parsed = parseScore(loadFixture());
    const alto = parsed.events.filter((e) => e.voiceId === voiceId("P1", 1, 2));
    // m1 whole E4 (4 quarters), m2 rest then dotted half F4 (3 quarters)
    const firstTwo = alto.slice(0, 2).map((e) => [e.step, e.durationQuarter, e.startQuarter]);
    expect(firstTwo).toEqual([
      ["E", 4, 0],
      ["F", 3, 5],
    ]);
    expect(alto.some((e) => e.startQuarter === 4)).toBe(false);
  });

  it("does not advance the cursor for chord tones", () => {
    const parsed = parseScore(loadFixture());
    const rh = parsed.events.filter((e) => e.voiceId === voiceId("P2", 1, 1));
    const measure1 = rh.filter((e) => e.measure === 1);
    expect(measure1).toHaveLength(3);
    expect(new Set(measure1.map((e) => e.startQuarter))).toEqual(new Set([0]));
  });
});

describe("identifyVoices", () => {
  it("treats a 4-staff single part as SATB + piano", () => {
    const labeled = identifyVoices([
      { id: "P1:1:1", partId: "P1", staff: 1, voice: 1, noteCount: 4 },
      { id: "P1:1:2", partId: "P1", staff: 1, voice: 2, noteCount: 4 },
      { id: "P1:2:1", partId: "P1", staff: 2, voice: 1, noteCount: 4 },
      { id: "P1:2:2", partId: "P1", staff: 2, voice: 2, noteCount: 4 },
      { id: "P1:3:1", partId: "P1", staff: 3, voice: 1, noteCount: 8 },
      { id: "P1:4:1", partId: "P1", staff: 4, voice: 1, noteCount: 8 },
    ]);
    const byId = Object.fromEntries(labeled.map((v) => [v.id, v.label]));
    expect(byId["P1:1:1"]).toBe("Soprano");
    expect(byId["P1:2:2"]).toBe("Bass");
    expect(byId["P1:3:1"]).toMatch(/Piano/);
    expect(byId["P1:4:1"]).toMatch(/Piano/);
  });
});
