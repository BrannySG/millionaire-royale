import { describe, expect, it } from "vitest";
import { parseClientMessage } from "../src/messages.js";

describe("parseClientMessage", () => {
  it("accepts valid answer submissions", () => {
    expect(parseClientMessage(JSON.stringify({ type: "SUBMIT_ANSWER", answer: "C" }))).toEqual({
      type: "SUBMIT_ANSWER",
      answer: "C",
    });
  });

  it("rejects invalid answers", () => {
    expect(parseClientMessage(JSON.stringify({ type: "SUBMIT_ANSWER", answer: "E" }))).toBeNull();
  });

  it("rejects malformed JSON", () => {
    expect(parseClientMessage("{nope")).toBeNull();
  });

  it("accepts host and heartbeat messages", () => {
    expect(parseClientMessage(JSON.stringify({ type: "START_GAME" }))).toEqual({ type: "START_GAME" });
    expect(parseClientMessage(JSON.stringify({ type: "PLAY_AGAIN" }))).toEqual({ type: "PLAY_AGAIN" });
    expect(parseClientMessage(JSON.stringify({ type: "PING" }))).toEqual({ type: "PING" });
  });
});
