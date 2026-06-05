import {
  ANSWER_KEYS,
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  type AnswerKey,
} from "@mr/shared";

export function sanitizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Collapse whitespace and trim.
  const cleaned = raw.replace(/\s+/g, " ").trim();
  if (cleaned.length < MIN_USERNAME_LENGTH) return null;
  return cleaned.slice(0, MAX_USERNAME_LENGTH);
}

export function isAnswerKey(value: unknown): value is AnswerKey {
  return (
    typeof value === "string" &&
    (ANSWER_KEYS as readonly string[]).includes(value)
  );
}
