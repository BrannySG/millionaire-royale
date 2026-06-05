import {
  ANSWER_KEYS,
  TIMERS,
  type AnswerKey,
  type ClientRoomState,
} from "@mr/shared";
import { AnswerButton } from "../components/AnswerButton.js";
import { Panel, StageShell } from "../components/StageShell.js";
import { PlayerList } from "../components/PlayerList.js";
import { Timer } from "../components/Timer.js";

export function QuestionScreen({
  state,
  myPlayerId,
  selected,
  onSelect,
  serverOffset = 0,
}: {
  state: ClientRoomState;
  myPlayerId?: string | null;
  selected: AnswerKey | null;
  onSelect: (answer: AnswerKey) => void;
  serverOffset?: number;
}) {
  const q = state.question;
  const me = state.players.find((p) => p.playerId === myPlayerId);
  const isSpectator = !!me && !me.alive;
  const locked = selected !== null || !!me?.answerLocked;

  return (
    <StageShell>
      <div className="flex items-center justify-between text-sm">
        <span className="rounded-full bg-stage-700/60 px-3 py-1 font-semibold tracking-wide text-gold-300">
          Round {state.roundNumber}
        </span>
        {q?.category && (
          <span className="text-slate-400">{q.category}</span>
        )}
      </div>

      <Timer
        endsAt={state.timerEndsAt}
        totalMs={TIMERS.questionMs}
        serverOffset={serverOffset}
      />

      <Panel className="p-6 text-center" glow>
        <h2 className="text-xl sm:text-2xl font-semibold leading-snug text-slate-50">
          {q?.prompt ?? "..."}
        </h2>
      </Panel>

      <div className="grid gap-3 sm:grid-cols-2">
        {ANSWER_KEYS.map((key) => (
          <AnswerButton
            key={key}
            letter={key}
            text={q?.answers[key] ?? ""}
            state={selected === key ? "selected" : "idle"}
            disabled={locked || isSpectator}
            onClick={() => onSelect(key)}
          />
        ))}
      </div>

      {isSpectator ? (
        <p className="text-center text-sm text-red-300/80 italic">
          You have been eliminated. Watching the survivors...
        </p>
      ) : locked ? (
        <p className="mr-pop text-center text-lg font-bold uppercase tracking-widest text-gold-400">
          Locked In
        </p>
      ) : (
        <p className="text-center text-sm text-slate-400">
          Tap an answer to lock it in. You can't change it.
        </p>
      )}

      <Panel className="p-4">
        <PlayerList
          players={state.players}
          myPlayerId={myPlayerId}
          phase="question"
        />
      </Panel>
    </StageShell>
  );
}
