import { useState } from "react";
import { MAX_USERNAME_LENGTH } from "@mr/shared";
import { Button } from "../components/Button.js";
import { Logo } from "../components/Logo.js";
import { Panel, StageShell } from "../components/StageShell.js";

export function HomeScreen({
  onCreate,
  onJoin,
  busy,
  error,
  initialUsername = "",
  initialRoomCode = "",
}: {
  onCreate: (username: string) => void;
  onJoin: (roomCode: string, username: string) => void;
  busy?: boolean;
  error?: string | null;
  initialUsername?: string;
  initialRoomCode?: string;
}) {
  const [username, setUsername] = useState(initialUsername);
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const trimmed = username.trim();
  const canPlay = trimmed.length > 0 && !busy;

  return (
    <StageShell className="items-center justify-center py-16">
      <div className="mt-6 mb-2 mr-rise">
        <Logo size="lg" />
      </div>
      <p className="text-center text-slate-300 italic mr-rise">
        Enter the hot seat.
      </p>

      {error && (
        <div className="w-full max-w-md rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-center text-sm text-red-300">
          {error}
        </div>
      )}

      <Panel className="w-full max-w-md p-6 mr-rise" glow>
        <label className="mb-1 block text-xs uppercase tracking-widest text-slate-400">
          Your name
        </label>
        <input
          value={username}
          maxLength={MAX_USERNAME_LENGTH}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. Branny"
          className="mb-5 w-full rounded-xl border border-royal-400/40 bg-stage-900/70 px-4 py-3 text-lg text-slate-50 outline-none placeholder:text-slate-500 focus:border-gold-400/70"
        />

        <Button
          className="w-full text-lg"
          disabled={!canPlay}
          onClick={() => onCreate(trimmed)}
        >
          Create Room
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-slate-500">
          <span className="h-px flex-1 bg-royal-400/20" />
          or join
          <span className="h-px flex-1 bg-royal-400/20" />
        </div>

        <div className="flex gap-2">
          <input
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ROOM CODE"
            className="w-full rounded-xl border border-royal-400/40 bg-stage-900/70 px-4 py-3 text-center text-lg font-bold tracking-[0.3em] text-gold-300 uppercase outline-none placeholder:tracking-normal placeholder:text-slate-500 focus:border-gold-400/70"
          />
          <Button
            variant="royal"
            disabled={!canPlay || roomCode.trim().length < 4}
            onClick={() => onJoin(roomCode.trim().toUpperCase(), trimmed)}
          >
            Join
          </Button>
        </div>
      </Panel>

      <p className="text-center text-xs text-slate-500">
        Last one standing wins a (fictional) $1,000,000.
      </p>
    </StageShell>
  );
}
