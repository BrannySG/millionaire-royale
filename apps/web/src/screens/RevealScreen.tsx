import {
  ANSWER_KEYS,
  type AnswerKey,
  type ClientRoomState,
} from "@mr/shared";
import {
  AnswerButton,
  type AnswerVisualState,
} from "../components/AnswerButton.js";
import { Panel, StageShell } from "../components/StageShell.js";
import { PlayerList } from "../components/PlayerList.js";

export function RevealScreen({
  state,
  myPlayerId,
  mySelected,
}: {
  state: ClientRoomState;
  myPlayerId?: string | null;
  mySelected: AnswerKey | null;
}) {
  const q = state.question;
  const correct = state.revealedCorrectAnswer;
  const me = state.players.find((p) => p.playerId === myPlayerId);

  function visualFor(key: AnswerKey): AnswerVisualState {
    if (key === correct) return "correct";
    if (key === mySelected) return "wrong";
    return "dimmed";
  }

  return (
    <StageShell>
      <div className="text-center">
        <span className="rounded-full bg-stage-700/60 px-3 py-1 text-sm font-semibold tracking-wide text-gold-300">
          Round {state.roundNumber}
        </span>
      </div>

      <Panel className="p-6 text-center" glow>
        <h2 className="text-xl sm:text-2xl font-semibold leading-snug text-slate-50">
          {q?.prompt ?? ""}
        </h2>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        {ANSWER_KEYS.map((key) => (
          <AnswerButton
            key={key}
            letter={key}
            text={q?.answers[key] ?? ""}
            state={visualFor(key)}
            disabled
          />
        ))}
      </div>

      <p
        className="mr-pop text-center text-2xl font-bold text-emerald-400"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Correct answer: {correct}
      </p>

      {me && me.lastAnswerCorrect !== null && (
        <p className="text-center text-lg font-semibold">
          {me.lastAnswerCorrect ? (
            <span className="text-emerald-400">You got it right!</span>
          ) : (
            <span className="text-red-400">You missed it.</span>
          )}
        </p>
      )}

      <Panel className="p-4">
        <PlayerList
          players={state.players}
          myPlayerId={myPlayerId}
          phase="reveal"
        />
      </Panel>
    </StageShell>
  );
}
