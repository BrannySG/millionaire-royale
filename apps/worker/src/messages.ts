import type { ClientMessage } from "@mr/shared";
import { isAnswerKey } from "./validation.js";

/**
 * Parse and validate a raw WebSocket payload into a typed ClientMessage.
 * Returns null if the payload is malformed or of an unknown type.
 */
export function parseClientMessage(raw: string): ClientMessage | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== "object" || data === null) return null;
  const msg = data as Record<string, unknown>;

  switch (msg.type) {
    case "START_GAME":
    case "PLAY_AGAIN":
    case "LEAVE_ROOM":
    case "PING":
      return { type: msg.type };
    case "SUBMIT_ANSWER":
      if (!isAnswerKey(msg.answer)) return null;
      return { type: "SUBMIT_ANSWER", answer: msg.answer };
    default:
      return null;
  }
}
