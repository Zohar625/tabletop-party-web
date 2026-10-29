import metadata from "../../../data/classic-directions.json" with { type: "json" };
import type { Question } from "../bluff/types.ts";
import type { ClassicCard, ClassicSettings } from "./types.ts";
const directions = new Map(metadata.cards.map((card) => [card.id, card]));
/** Pure adapter also allows tests to exercise selection without importing Vite's answer bundle. */
export function adaptClassicCards(
  questions: readonly Question[],
  settings: ClassicSettings,
): ClassicCard[] {
  const selected = new Set(settings.packIds);
  const seen = new Set<string>();
  const cards: ClassicCard[] = [];
  for (const question of questions) {
    if (
      question.status !== "verified" ||
      !question.packIds.some((id) => selected.has(id)) ||
      seen.has(question.conceptId)
    )
      continue;
    const direction = directions.get(question.id);
    if (!direction || direction.conceptId !== question.conceptId)
      throw Error(`题目缺少匹配的方向元数据：${question.id}`);
    if (
      direction.decoys.length !== 2 ||
      new Set([direction.direction, ...direction.decoys]).size !== 3
    )
      throw Error(`题目方向不互异：${question.id}`);
    const difficulty =
      settings.difficulty === "mixed"
        ? question.difficulty
        : settings.difficulty;
    if (difficulty !== 1 && difficulty !== 2 && difficulty !== 3)
      throw Error(`题目难度无效：${question.id}`);
    let hints: string[] = [];
    if (difficulty === 1) hints = [direction.direction];
    if (difficulty === 2) {
      // Stable rotation prevents a fixed correct slot; actual gameplay already randomizes the deck.
      const options = [direction.direction, ...direction.decoys];
      const offset =
        Array.from(question.conceptId).reduce(
          (sum, c) => sum + c.charCodeAt(0),
          0,
        ) % 3;
      hints = [...options.slice(offset), ...options.slice(0, offset)];
    }
    seen.add(question.conceptId);
    cards.push({
      id: question.id,
      conceptId: question.conceptId,
      term: question.term,
      explanation: question.explanation,
      sources: question.sources.map((source) => ({ ...source })),
      difficulty,
      hints,
    });
  }
  return cards;
}
type QuestionLoader = () => Promise<{ allQuestions: Question[] }>;
/** Call only on the authoritative host, at start/rematch. No eager answer import. */
export async function loadCards(
  settings: ClassicSettings,
  loader: QuestionLoader = () => import("../bluff/questions.ts"),
): Promise<ClassicCard[]> {
  const { allQuestions } = await loader();
  return adaptClassicCards(allQuestions, settings);
}
