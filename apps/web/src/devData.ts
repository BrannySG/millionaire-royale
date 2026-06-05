import type { ClientRoomState, GamePhase, PlayerState } from "@mr/shared";

function player(
  id: string,
  username: string,
  overrides: Partial<PlayerState> = {},
): PlayerState {
  return {
    playerId: id,
    username,
    alive: true,
    connected: true,
    isHost: false,
    joinedAt: 0,
    lastSeenAt: 0,
    answerLocked: false,
    lastAnswerCorrect: null,
    ...overrides,
  };
}

export const MY_ID = "me";

const FAKE_QUESTION = {
  id: "demo",
  category: "Geography",
  prompt: "Which of these countries has the largest land area?",
  answers: {
    A: "Australia",
    B: "Canada",
    C: "Brazil",
    D: "China",
  },
};

export function fakeState(phase: GamePhase): ClientRoomState {
  const base: ClientRoomState = {
    roomCode: "K7FQ2",
    phase,
    players: [
      player(MY_ID, "Branny", { isHost: true }),
      player("p2", "Sam"),
      player("p3", "Priya"),
      player("p4", "Max"),
      player("p5", "Lola", { connected: false }),
    ],
    question: phase === "lobby" ? null : FAKE_QUESTION,
    timerEndsAt: Date.now() + 30_000,
    roundNumber: phase === "lobby" ? 0 : 3,
    winnerPlayerId: null,
    winnerPlayerIds: [],
  };

  switch (phase) {
    case "countdown":
      base.timerEndsAt = Date.now() + 3_000;
      break;
    case "question":
      base.players[1].answerLocked = true;
      base.players[2].answerLocked = true;
      break;
    case "reveal":
    case "elimination":
      base.revealedCorrectAnswer = "B";
      base.timerEndsAt = Date.now() + 4_000;
      base.players[0].lastAnswerCorrect = true;
      base.players[1].lastAnswerCorrect = true;
      base.players[2].lastAnswerCorrect = false;
      base.players[3].lastAnswerCorrect = false;
      if (phase === "elimination") {
        base.players[2].alive = false;
        base.players[3].alive = false;
        base.players[4].alive = false;
      }
      break;
    case "finished":
      base.winnerPlayerId = MY_ID;
      base.winnerPlayerIds = [MY_ID];
      base.players.forEach((p, i) => {
        if (i !== 0) p.alive = false;
      });
      break;
  }
  return base;
}
