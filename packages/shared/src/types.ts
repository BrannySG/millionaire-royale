// Shared domain types used by both the Cloudflare Worker / Durable Object
// (authoritative server) and the React frontend (renderer only).

export type AnswerKey = "A" | "B" | "C" | "D";

export type Difficulty = "easy" | "medium" | "hard";

export type GamePhase =
  | "lobby"
  | "countdown"
  | "question"
  | "reveal"
  | "elimination"
  | "finished";

export type PlayerState = {
  playerId: string;
  username: string;
  alive: boolean;
  connected: boolean;
  isHost: boolean;
  joinedAt: number;
  lastSeenAt: number;
  answerLocked: boolean;
  lastAnswerCorrect: boolean | null;
};

export type LockedAnswer = {
  playerId: string;
  answer: AnswerKey;
  lockedAt: number;
};

export type Answers = {
  A: string;
  B: string;
  C: string;
  D: string;
};

export type Question = {
  id: string;
  category?: string;
  difficulty?: Difficulty;
  prompt: string;
  answers: Answers;
  correctAnswer: AnswerKey;
};

// The version of a question that is safe to send to clients: it never contains
// the correct answer.
export type PublicQuestion = {
  id: string;
  category?: string;
  difficulty?: Difficulty;
  prompt: string;
  answers: Answers;
};

// Authoritative room state, owned by the Durable Object. This is the full
// internal model and may contain secret information (e.g. the correct answer).
export type RoomState = {
  roomCode: string;
  phase: GamePhase;
  hostPlayerId: string | null;
  players: Record<string, PlayerState>;
  questionIndex: number;
  currentQuestion: PublicQuestion | null;
  currentQuestionId: string | null;
  currentCorrectAnswer: AnswerKey | null;
  lockedAnswers: Record<string, LockedAnswer>;
  timerEndsAt: number | null;
  roundNumber: number;
  winnerPlayerId: string | null;
  winnerPlayerIds: string[];
  usedQuestionIds: string[];
  cleanupAt: number | null;
  createdAt: number;
  updatedAt: number;
};

// Client-facing state. Never leaks hidden information: the correct answer is
// only present during the reveal/elimination/finished phases.
export type ClientRoomState = {
  roomCode: string;
  phase: GamePhase;
  players: PlayerState[];
  question: PublicQuestion | null;
  timerEndsAt: number | null;
  roundNumber: number;
  revealedCorrectAnswer?: AnswerKey;
  winnerPlayerId: string | null;
  winnerPlayerIds: string[];
};

// ---------------------------------------------------------------------------
// HTTP API payloads (room bootstrap happens over HTTP, gameplay over WS).
// ---------------------------------------------------------------------------

export type CreateRoomRequest = {
  username: string;
};

export type JoinRoomRequest = {
  username: string;
  existingPlayerId?: string;
};

// Returned by create/join. The client opens a WebSocket using playerId + token.
export type JoinResponse = {
  roomCode: string;
  playerId: string;
  token: string;
  isHost: boolean;
};

export type ApiErrorResponse = {
  error: string;
  code?: string;
};

// ---------------------------------------------------------------------------
// WebSocket message protocol
// ---------------------------------------------------------------------------

export type ClientMessage =
  | { type: "START_GAME" }
  | { type: "SUBMIT_ANSWER"; answer: AnswerKey }
  | { type: "PLAY_AGAIN" }
  | { type: "LEAVE_ROOM" }
  | { type: "PING" };

export type ServerMessage =
  | { type: "ROOM_JOINED"; roomCode: string; playerId: string; isHost: boolean }
  | { type: "STATE_SNAPSHOT"; state: ClientRoomState }
  | { type: "ERROR"; message: string; code?: string }
  | { type: "PONG"; serverTime: number };
