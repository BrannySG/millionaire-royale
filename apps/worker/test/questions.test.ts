import { describe, expect, it } from "vitest";
import { QUESTIONS, pickUnusedQuestion, toPublicQuestion } from "../src/questions.js";

describe("question bank", () => {
  it("contains the MVP-sized bundled question set", () => {
    expect(QUESTIONS.length).toBe(150);
  });

  it("has unique ids and valid answer keys", () => {
    const ids = new Set<string>();
    for (const question of QUESTIONS) {
      expect(ids.has(question.id), question.id).toBe(false);
      ids.add(question.id);
      expect(["A", "B", "C", "D"]).toContain(question.correctAnswer);
      expect(Object.keys(question.answers).sort()).toEqual(["A", "B", "C", "D"]);
    }
  });

  it("does not leak correctAnswer in public questions", () => {
    const publicQuestion = toPublicQuestion(QUESTIONS[0]);
    expect("correctAnswer" in publicQuestion).toBe(false);
  });

  it("returns null when all questions have been used", () => {
    expect(pickUnusedQuestion(QUESTIONS.map((q) => q.id))).toBeNull();
  });
});
