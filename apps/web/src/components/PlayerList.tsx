import type { GamePhase, PlayerState } from "@mr/shared";
import { cx } from "../lib/cx.js";

export function PlayerList({
  players,
  myPlayerId,
  phase,
}: {
  players: PlayerState[];
  myPlayerId?: string | null;
  phase: GamePhase;
}) {
  const aliveCount = players.filter((p) => p.alive).length;
  const showLock = phase === "question";
  const showResult = phase === "reveal" || phase === "elimination";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
        <span>Contestants</span>
        <span className="text-gold-400">{aliveCount} alive</span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {players.map((p) => {
          const isMe = p.playerId === myPlayerId;
          return (
            <li
              key={p.playerId}
              className={cx(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                p.alive
                  ? "border-royal-400/25 bg-stage-700/40"
                  : "border-transparent bg-stage-800/30 text-slate-500",
                isMe && "ring-1 ring-gold-400/40",
              )}
            >
              <span
                className={cx(
                  "h-2 w-2 shrink-0 rounded-full",
                  p.connected ? "bg-emerald-400" : "bg-slate-600",
                )}
                title={p.connected ? "Connected" : "Disconnected"}
              />
              <span
                className={cx(
                  "flex-1 truncate font-medium",
                  !p.alive && "line-through",
                )}
              >
                {p.username}
                {isMe && <span className="ml-1 text-gold-400/80">(you)</span>}
              </span>
              {p.isHost && (
                <span className="rounded bg-gold-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-300">
                  Host
                </span>
              )}
              {showLock && p.alive && (
                <span
                  className={cx(
                    "text-[11px] font-semibold uppercase tracking-wide",
                    p.answerLocked ? "text-gold-400" : "text-slate-500",
                  )}
                >
                  {p.answerLocked ? "Locked" : "..."}
                </span>
              )}
              {showResult && p.alive && p.lastAnswerCorrect !== null && (
                <span
                  className={cx(
                    "text-[11px] font-bold uppercase",
                    p.lastAnswerCorrect ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {p.lastAnswerCorrect ? "Correct" : "Wrong"}
                </span>
              )}
              {!p.alive && (
                <span className="text-[10px] font-semibold uppercase tracking-wide text-red-400/70">
                  Out
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
