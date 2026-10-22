import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createDefaultConfig,
  READ_PRESETS,
} from "../src/games/bluff/defaults.ts";
import {
  buildQuestionPool,
  createGame,
  privateView,
  reduceGame,
} from "../src/games/bluff/engine.ts";
import type { Question } from "../src/games/bluff/types.ts";
function readJson(path: string) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
}
test("新开局保持5秒和4人默认值", () => {
  const config = createDefaultConfig(["outrageous-long-cards"]);
  assert.equal(config.readSeconds, 5);
  assert.equal(config.playerCount, 4);
  assert.deepEqual(READ_PRESETS, [5, 10, 20, 30]);
});
test("可玩题库扩为90道长卡，保留旧题标识并支持9人一圈", () => {
  const registry = readJson("../data/playtest-registry.json");
  assert.equal(registry.packs.length, 1);
  const pack = readJson(`../data/${registry.packs[0].file}`);
  assert.equal(pack.questions.length, 90);
  assert.equal(registry.packs[0].verifiedCount, 90);
  const config = createDefaultConfig([pack.id]);
  const questions = pack.questions as Question[];
  for (const q of questions) {
    const count = [...q.explanation].filter(
      (c) => c >= "\u4e00" && c <= "\u9fff",
    ).length;
    assert.ok(count >= 120 && count <= 210, q.term);
    assert.equal(q.status, "verified");
    assert.ok(q.sources.length);
  }
  assert.ok(questions.some((q) => q.term === "便器侍从"));
  const pool = buildQuestionPool(config, questions, new Set());
  assert.equal(pool.length, 90);
  assert.equal(new Set(pool.map((q) => q.conceptId)).size, 90);
  for (const conceptId of [
    "groom-of-stool",
    "pearlfish-sea-cucumber",
    "prince-ruperts-drop",
    "eukonkanto",
  ]) {
    assert.equal(
      questions.find((q) => q.conceptId === conceptId)?.id,
      `outrageous-${conceptId}`,
    );
  }
  let s = createGame(config, pool, 123);
  s = reduceGame(
    s,
    { type: "read", gameId: s.id, roundId: s.roundId, sequence: s.sequence },
    1000,
  );
  assert.equal(s.deadline, 6000);
  assert.ok(privateView(s, "p1", 5999));
  assert.equal(privateView(s, "p1", 6000), null);
  assert.equal(
    createGame({ ...config, playerCount: 9 }, pool, 123).config.playerCount,
    9,
  );
  assert.throws(
    () => createGame({ ...config, playerCount: 9 }, pool.slice(0, 80), 123),
    /81.*80/,
  );
  assert.equal(
    buildQuestionPool(config, questions, new Set([questions[0]!.conceptId]))
      .length,
    89,
  );
  const archive = readJson("../data/pack-registry.json");
  assert.equal(archive.packs.length, 5);
  assert.equal(
    archive.packs.reduce(
      (sum: number, p: { file: string }) =>
        sum + readJson(`../data/${p.file}`).questions.length,
      0,
    ),
    450,
  );
  const archivedCards: Question[] = archive.packs.flatMap(
    (p: { file: string }) => readJson(`../data/${p.file}`).questions,
  );
  for (const question of questions) {
    const old = archivedCards.find((q) => q.conceptId === question.conceptId);
    if (old)
      assert.equal(question.id, old.id, `扩写${question.term}不能重建历史标识`);
  }
});
