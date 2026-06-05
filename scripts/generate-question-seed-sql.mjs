import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const questions = JSON.parse(
  readFileSync(resolve("questions/seed_questions.json"), "utf8"),
);
const outFile = resolve("migrations/0002_seed_questions.sql");

function sql(value) {
  if (value === undefined || value === null) return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

const lines = [
  "-- Generated from questions/seed_questions.json.",
  "-- Re-run `pnpm questions:seed-sql` after editing the question bank.",
  "",
  "DELETE FROM questions;",
  "",
];

for (const q of questions) {
  lines.push(
    `INSERT INTO questions (id, category, difficulty, prompt, answer_a, answer_b, answer_c, answer_d, correct_answer, created_at) VALUES (${[
      sql(q.id),
      sql(q.category),
      sql(q.difficulty),
      sql(q.prompt),
      sql(q.answers.A),
      sql(q.answers.B),
      sql(q.answers.C),
      sql(q.answers.D),
      sql(q.correctAnswer),
      "0",
    ].join(", ")});`,
  );
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${lines.join("\n")}\n`);
console.log(`Wrote ${outFile} (${questions.length} questions).`);
