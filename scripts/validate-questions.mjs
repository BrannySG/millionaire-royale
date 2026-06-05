import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve("questions/seed_questions.json");
const questions = JSON.parse(readFileSync(file, "utf8"));
const answerKeys = ["A", "B", "C", "D"];
const difficulties = new Set(["easy", "medium", "hard"]);
const ids = new Set();

if (!Array.isArray(questions)) {
  throw new Error("Question bank must be an array");
}

for (const [index, q] of questions.entries()) {
  const label = q?.id ?? `question at index ${index}`;
  if (!q || typeof q !== "object") {
    throw new Error(`${label}: must be an object`);
  }
  if (typeof q.id !== "string" || q.id.length === 0) {
    throw new Error(`${label}: missing id`);
  }
  if (ids.has(q.id)) {
    throw new Error(`${label}: duplicate id`);
  }
  ids.add(q.id);
  if (typeof q.prompt !== "string" || q.prompt.trim().length === 0) {
    throw new Error(`${label}: missing prompt`);
  }
  if (q.difficulty !== undefined && !difficulties.has(q.difficulty)) {
    throw new Error(`${label}: invalid difficulty`);
  }
  if (!answerKeys.includes(q.correctAnswer)) {
    throw new Error(`${label}: invalid correctAnswer`);
  }
  for (const key of answerKeys) {
    if (typeof q.answers?.[key] !== "string" || q.answers[key].trim().length === 0) {
      throw new Error(`${label}: missing answer ${key}`);
    }
  }
}

console.log(`Validated ${questions.length} questions.`);
