import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  adaptClassicCards,
  loadCards,
} from "../src/games/bluff-classic/bank.ts";
import { classicPacks } from "../src/games/bluff-classic/catalog.ts";
import type { Question } from "../src/games/bluff/types.ts";
import { DEFAULT_CLASSIC_SETTINGS } from "../src/games/bluff-classic/types.ts";
const original = JSON.parse(
  readFileSync(
    new URL("../data/playtest/outrageous-long-cards.json", import.meta.url),
    "utf8",
  ),
) as { questions: Question[] };
const metadata = JSON.parse(
  readFileSync(
    new URL("../data/classic-directions.json", import.meta.url),
    "utf8",
  ),
) as {
  schemaVersion: number;
  cards: {
    id: string;
    conceptId: string;
    direction: string;
    decoys: string[];
  }[];
};
const settings = DEFAULT_CLASSIC_SETTINGS;
test("all 270 original verified concepts have exactly one reviewed direction record", () => {
  assert.equal(metadata.schemaVersion, 1);
  assert.equal(original.questions.length, 270);
  assert.equal(metadata.cards.length, 270);
  assert.equal(new Set(metadata.cards.map((c) => c.id)).size, 270);
  assert.equal(new Set(metadata.cards.map((c) => c.conceptId)).size, 270);
  for (const q of original.questions) {
    const m = metadata.cards.find((c) => c.id === q.id);
    assert.ok(m, q.id);
    assert.equal(m.conceptId, q.conceptId);
    assert.equal(typeof m.direction, "string");
    assert.ok(m.direction.trim());
    assert.equal(m.decoys.length, 2);
    assert.equal(new Set([m.direction, ...m.decoys]).size, 3);
    assert.ok(m.decoys.every((d) => typeof d === "string" && d.trim()));
  }
  assert.deepEqual(
    classicPacks.map((p) => [p.id, p.count]),
    [["outrageous-long-cards", 270]],
  );
});
test("all four difficulty settings preserve original text, IDs and sources with correct hint shapes", () => {
  const before = JSON.stringify(original.questions);
  for (const difficulty of [1, 2, 3, "mixed"] as const) {
    const cards = adaptClassicCards(original.questions, {
      ...settings,
      difficulty,
    });
    assert.equal(cards.length, 270);
    for (const [i, card] of cards.entries()) {
      const q = original.questions[i];
      const m = metadata.cards.find((c) => c.id === card.id)!;
      assert.equal(card.id, q.id);
      assert.equal(card.conceptId, q.conceptId);
      assert.equal(card.term, q.term);
      assert.equal(card.explanation, q.explanation);
      assert.deepEqual(card.sources, q.sources);
      assert.equal(
        card.difficulty,
        difficulty === "mixed" ? q.difficulty : difficulty,
      );
      assert.equal(
        card.hints.length,
        card.difficulty === 1 ? 1 : card.difficulty === 2 ? 3 : 0,
      );
      if (card.difficulty !== 3)
        assert.equal(card.hints.filter((h) => h === m.direction).length, 1);
      if (card.difficulty === 2)
        assert.deepEqual(
          [...card.hints].sort(),
          [m.direction, ...m.decoys].sort(),
        );
    }
  }
  assert.equal(JSON.stringify(original.questions), before);
});
test("drafts and unchosen packs are removed before concept deduplication", () => {
  const first = original.questions[0];
  const draft = { ...first, id: "draft-copy", status: "draft" as const };
  const unchosen = { ...first, id: "other-copy", packIds: ["other"] };
  assert.equal(
    adaptClassicCards([draft, unchosen, first, first], settings).length,
    1,
  );
  assert.equal(
    adaptClassicCards(original.questions, { ...settings, packIds: [] }).length,
    0,
  );
  assert.equal(
    adaptClassicCards(original.questions, { ...settings, packIds: ["unknown"] })
      .length,
    0,
  );
  assert.equal(
    adaptClassicCards(original.questions, {
      ...settings,
      packIds: [...settings.packIds, ...settings.packIds],
    }).length,
    270,
  );
});
test("missing metadata and unsupported difficulty fail visibly", () => {
  assert.throws(
    () =>
      adaptClassicCards(
        [{ ...original.questions[0], id: "missing" }],
        settings,
      ),
    /方向/,
  );
  assert.throws(
    () =>
      adaptClassicCards(
        [{ ...original.questions[0], difficulty: 7 }],
        settings,
      ),
    /难度/,
  );
});
test("host loader uses the same filtering pipeline and remains lazy", async () => {
  let loaded = false;
  const fetchQuestions = async () => {
    loaded = true;
    return { allQuestions: original.questions };
  };
  assert.equal(loaded, false);
  assert.equal(
    (await loadCards({ ...settings, difficulty: 3 }, fetchQuestions)).length,
    270,
  );
  assert.equal(loaded, true);
});
test("regressions distinguish biological kingdoms, behaviours and misleading object names", () => {
  const direction = (concept: string) =>
    metadata.cards.find((c) => c.conceptId === concept)!.direction;
  assert.equal(direction("ophiocordyceps-unilateralis"), "一种真菌");
  assert.equal(direction("nature-hydnora-africana"), "一种植物");
  assert.equal(direction("pearlfish-sea-cucumber"), "一种动物");
  assert.equal(
    direction("sea-slug-extreme-autotomy"),
    "一种生物行为或生理变化",
  );
  assert.equal(direction("nature-sea-spider"), "一种动物身体结构");
  assert.equal(direction("objects-robot-catfish"), "一种人造实物");
  assert.equal(
    direction("outrageous-science-mars-spiders"),
    "一种自然地貌或景观",
  );
  assert.equal(
    direction("outrageous-science-red-sprites"),
    "一种物理或化学现象",
  );
});
