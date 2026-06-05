// Game-wide tunables shared between server and client.

export const TIMERS = {
  /** Lobby -> first question countdown. */
  countdownMs: 3_000,
  /** How long players have to lock in an answer. */
  questionMs: 30_000,
  /** Dramatic pause showing the correct answer. */
  revealMs: 4_000,
  /** "N contestants remain" screen before the next question. */
  eliminationMs: 3_000,
  /** Delete a room after this long with zero connected players. */
  emptyRoomCleanupMs: 30 * 60 * 1_000,
} as const;

export const ROOM = {
  minPlayers: 2,
  maxPlayers: 20,
  codeLength: 5,
  // Excludes easily confused characters: 0, O, I, L, 1.
  codeAlphabet: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
} as const;

export const MAX_USERNAME_LENGTH = 20;
export const MIN_USERNAME_LENGTH = 1;

export const ANSWER_KEYS = ["A", "B", "C", "D"] as const;

export const ERROR_CODES = {
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_FULL: "ROOM_FULL",
  ROOM_ALREADY_STARTED: "ROOM_ALREADY_STARTED",
  ROOM_FINISHED: "ROOM_FINISHED",
  INVALID_USERNAME: "INVALID_USERNAME",
  INVALID_PAYLOAD: "INVALID_PAYLOAD",
  NOT_HOST: "NOT_HOST",
  NOT_ALIVE: "NOT_ALIVE",
  WRONG_PHASE: "WRONG_PHASE",
  ALREADY_ANSWERED: "ALREADY_ANSWERED",
  NOT_ENOUGH_PLAYERS: "NOT_ENOUGH_PLAYERS",
  AUTH_FAILED: "AUTH_FAILED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
