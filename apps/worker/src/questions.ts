import type { Question, PublicQuestion } from "@mr/shared";
import seed from "../../../questions/seed_questions.json";

export const QUESTIONS: Question[] = seed as Question[];

const QUESTIONS_BY_ID = new Map<string, Question>(
  QUESTIONS.map((q) => [q.id, q]),
);

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS_BY_ID.get(id);
}

/** Strip the correct answer so a question is safe to send to clients. */
export function toPublicQuestion(q: Question): PublicQuestion {
  return {
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    prompt: q.prompt,
    answers: q.answers,
  };
}

/**
 * Pick a random question that has not been used yet in this game.
 * Returns null when the bank is exhausted.
 */
export function pickUnusedQuestion(usedIds: Iterable<string>): Question | null {
  const used = new Set(usedIds);
  const available = QUESTIONS.filter((q) => !used.has(q.id));
  if (available.length === 0) return null;
  const idx = Math.floor(Math.random() * available.length);
  return available[idx];
}
