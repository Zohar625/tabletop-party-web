import catalog from "../../../data/playtest-registry.json";
import type { Question } from "./types.ts";
const modules = import.meta.glob("../../../data/playtest/*.json", {
  eager: true,
  import: "default",
}) as Record<
  string,
  { id: string; description: string; questions: Question[] }
>;
export const packs = catalog.packs.map((p) => {
  const data = Object.values(modules).find((d) => d.id === p.id);
  if (!data) throw Error(`题包未找到：${p.id}`);
  return {
    ...p,
    description: data.description,
    questions: data.questions.filter((q) => q.status === "verified"),
  };
});
export const allQuestions = packs.flatMap((p) => p.questions);
