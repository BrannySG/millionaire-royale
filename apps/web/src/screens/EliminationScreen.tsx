import { TIMERS, type ClientRoomState } from "@mr/shared";
import { Panel, StageShell } from "../components/StageShell.js";
import { Timer } from "../components/Timer.js";
import { cx } from "../lib/cx.js";

export function EliminationScreen({
  state,
  myPlayerId,
  serverOffset = 0,
}: {
  state: ClientRoomState;
  myPlayerId?: string | null;
  serverOffset?: number;
}) {
  const survivors = state.players.filter((p) => p.alive);
  const eliminated = state.players.filter((p) => !p.alive);
  const me = state.players.find((p) => p.playerId === myPlayerId);
  const justOut = me && !me.alive;

  return (
    <StageShell className="items-center justify-center">
      <h1
        className="mr-pop text-center text-4xl sm:text-5xl font-bold text-gold-300"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {survivors.length} contestant{survivors.length === 1 ? "" : "s"} remain
      </h1>

      {justOut && (
        <p className="mr-rise text-center text-lg font-semibold text-red-400">
          You've been eliminated.
        </p>
      )}

      <Panel className="w-full max-w-md p-5" glow>
        <div className="mb-2 text-xs uppercase tracking-widest text-emerald-400">
          Still standing
        </div>
        <div className="flex flex-wrap gap-2">
          {survivors.map((p) => (
            <span
              key={p.playerId}
              className={cx(
                "rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold",
                p.playerId === myPlayerId && "ring-1 ring-gold-400/50",
              )}
            >
              {p.username}
            </span>
          ))}
        </div>
      </Panel>

      {eliminated.length > 0 && (
        <Panel className="w-full max-w-md p-5">
          <div className="mb-2 text-xs uppercase tracking-widest text-slate-500">
            Eliminated
          </div>
          <div className="flex flex-wrap gap-2">
            {eliminated.map((p) => (
              <span
                key={p.playerId}
                className="rounded-lg bg-stage-800/60 px-3 py-1.5 text-sm text-slate-500 line-through"
              >
                {p.username}
              </span>
            ))}
          </div>
        </Panel>
      )}

      <div className="text-center text-sm text-slate-400">Next question in</div>
      <Timer
        endsAt={state.timerEndsAt}
        totalMs={TIMERS.eliminationMs}
        serverOffset={serverOffset}
      />
    </StageShell>
  );
}
