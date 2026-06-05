import type { ClientRoomState } from "@mr/shared";
import { Button } from "../components/Button.js";
import { Logo } from "../components/Logo.js";
import { Panel, StageShell } from "../components/StageShell.js";

export function WinnerScreen({
  state,
  myPlayerId,
  onPlayAgain,
  onLeave,
}: {
  state: ClientRoomState;
  myPlayerId?: string | null;
  onPlayAgain: () => void;
  onLeave: () => void;
}) {
  const me = state.players.find((p) => p.playerId === myPlayerId);
  const isHost = !!me?.isHost;

  const winners = state.players.filter((p) =>
    state.winnerPlayerIds.includes(p.playerId),
  );
  const winnerNames =
    winners.length > 0
      ? winners.map((w) => w.username)
      : state.players.filter((p) => p.alive).map((p) => p.username);

  const title =
    winnerNames.length === 0
      ? "No winner"
      : winnerNames.length === 1
        ? `${winnerNames[0]} wins`
        : `${winnerNames.join(" & ")} win`;

  const iWon = !!myPlayerId && state.winnerPlayerIds.includes(myPlayerId);

  return (
    <StageShell className="items-center justify-center">
      <div className="mb-2">
        <Logo size="sm" />
      </div>

      <Panel className="w-full max-w-lg p-8 text-center mr-pop" glow>
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {winnerNames.length > 1 ? "Co-champions" : "Champion"}
        </div>
        <h1
          className="my-3 text-4xl sm:text-5xl font-bold uppercase tracking-wide text-gold-300 drop-shadow-[0_2px_18px_rgba(245,197,24,0.45)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h1>
        <div
          className="my-4 text-5xl sm:text-6xl font-bold text-emerald-400"
          style={{ fontFamily: "var(--font-display)" }}
        >
          $1,000,000
        </div>
        {iWon && (
          <p className="text-lg font-semibold text-gold-200">
            That's you. Take a bow.
          </p>
        )}
        <p className="mt-2 text-xs text-slate-500">
          Prize money is fictional and purely for the drama.
        </p>
      </Panel>

      <div className="flex flex-col items-center gap-2">
        {isHost ? (
          <Button className="w-full max-w-sm text-lg" onClick={onPlayAgain}>
            Play Again
          </Button>
        ) : (
          <p className="text-slate-400 italic">
            Waiting for the host to start a new game...
          </p>
        )}
        <Button variant="ghost" className="text-sm" onClick={onLeave}>
          Leave room
        </Button>
      </div>
    </StageShell>
  );
}
