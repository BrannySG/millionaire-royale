import { ROOM, type ClientRoomState } from "@mr/shared";
import { Button } from "../components/Button.js";
import { Logo } from "../components/Logo.js";
import { Panel, StageShell } from "../components/StageShell.js";
import { PlayerList } from "../components/PlayerList.js";

export function LobbyScreen({
  state,
  myPlayerId,
  onStart,
  onLeave,
  onCopyInvite,
  copied,
}: {
  state: ClientRoomState;
  myPlayerId?: string | null;
  onStart: () => void;
  onLeave: () => void;
  onCopyInvite: () => void;
  copied?: boolean;
}) {
  const me = state.players.find((p) => p.playerId === myPlayerId);
  const isHost = !!me?.isHost;
  const playerCount = state.players.length;
  const canStart = isHost && playerCount >= ROOM.minPlayers;

  return (
    <StageShell>
      <div className="flex items-center justify-between">
        <Logo size="sm" />
        <Button variant="ghost" className="px-3 py-2 text-sm" onClick={onLeave}>
          Leave
        </Button>
      </div>

      <Panel className="p-6 text-center" glow>
        <div className="text-xs uppercase tracking-widest text-slate-400">
          Room code
        </div>
        <div
          className="my-2 text-5xl font-bold tracking-[0.4em] text-gold-300"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {state.roomCode}
        </div>
        <Button
          variant="ghost"
          className="text-sm"
          onClick={onCopyInvite}
        >
          {copied ? "Link copied!" : "Copy invite link"}
        </Button>
      </Panel>

      <Panel className="p-5">
        <PlayerList
          players={state.players}
          myPlayerId={myPlayerId}
          phase="lobby"
        />
      </Panel>

      {isHost ? (
        <div className="flex flex-col items-center gap-2">
          <Button
            className="w-full max-w-sm text-lg"
            disabled={!canStart}
            onClick={onStart}
          >
            Start Game
          </Button>
          {!canStart && (
            <p className="text-sm text-slate-400">
              Need at least {ROOM.minPlayers} contestants to begin.
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-slate-300 italic">
          Waiting for contestants...
        </p>
      )}
    </StageShell>
  );
}
