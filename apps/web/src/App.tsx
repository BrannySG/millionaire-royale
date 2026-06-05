import { useCallback, useEffect, useRef, useState } from "react";
import type { AnswerKey } from "@mr/shared";
import { HomeScreen } from "./screens/HomeScreen.js";
import { GameView } from "./screens/GameView.js";
import { Logo } from "./components/Logo.js";
import { StageShell } from "./components/StageShell.js";
import { Preview } from "./Preview.js";
import { useRoomSocket } from "./hooks/useRoomSocket.js";
import { createRoom, joinRoom } from "./lib/api.js";
import { useSoundCues } from "./hooks/useSoundCues.js";
import {
  clearSession,
  loadSession,
  loadUsername,
  saveSession,
  saveUsername,
  type Session,
} from "./lib/session.js";

export function App() {
  if (new URLSearchParams(location.search).has("preview")) {
    return <Preview />;
  }
  return <LiveApp />;
}

function LiveApp() {
  const [inRoom, setInRoom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [copied, setCopied] = useState(false);
  const lastRound = useRef(-1);

  const handleFatal = useCallback(() => {
    clearSession();
    setInRoom(false);
    setHomeError("Connection lost. Please rejoin.");
  }, []);

  const sock = useRoomSocket({ onFatal: handleFatal });
  const { snapshot, status, serverOffset, connect, disconnect, send } = sock;
  const { soundEnabled, toggleSound } = useSoundCues(snapshot);

  // Attempt to resume an existing session on first load.
  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    const existing = loadSession();
    if (existing) {
      setInRoom(true);
      connect(existing);
    }
  }, [connect]);

  // Reset the locally selected answer at the start of each new question.
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.phase === "question" && snapshot.roundNumber !== lastRound.current) {
      lastRound.current = snapshot.roundNumber;
      setSelected(null);
    }
    if (snapshot.phase === "lobby") {
      lastRound.current = -1;
      setSelected(null);
    }
  }, [snapshot]);

  const startSession = useCallback(
    (session: Session) => {
      saveSession(session);
      saveUsername(session.username);
      setHomeError(null);
      setInRoom(true);
      connect(session);
    },
    [connect],
  );

  const handleCreate = useCallback(
    async (username: string) => {
      setBusy(true);
      setHomeError(null);
      try {
        const r = await createRoom(username);
        startSession({
          roomCode: r.roomCode,
          playerId: r.playerId,
          token: r.token,
          username,
        });
      } catch (e) {
        setHomeError(e instanceof Error ? e.message : "Failed to create room");
      } finally {
        setBusy(false);
      }
    },
    [startSession],
  );

  const handleJoin = useCallback(
    async (roomCode: string, username: string) => {
      setBusy(true);
      setHomeError(null);
      try {
        const r = await joinRoom(roomCode, username);
        startSession({
          roomCode: r.roomCode,
          playerId: r.playerId,
          token: r.token,
          username,
        });
      } catch (e) {
        setHomeError(e instanceof Error ? e.message : "Failed to join room");
      } finally {
        setBusy(false);
      }
    },
    [startSession],
  );

  const handleLeave = useCallback(() => {
    send({ type: "LEAVE_ROOM" });
    disconnect();
    clearSession();
    setInRoom(false);
    setSelected(null);
  }, [disconnect, send]);

  const handleSelect = useCallback(
    (answer: AnswerKey) => {
      setSelected(answer);
      send({ type: "SUBMIT_ANSWER", answer });
    },
    [send],
  );

  const handleCopyInvite = useCallback(() => {
    if (!snapshot) return;
    const link = `${location.origin}/?room=${snapshot.roomCode}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }, [snapshot]);

  if (!inRoom) {
    const params = new URLSearchParams(location.search);
    return (
      <HomeScreen
        onCreate={handleCreate}
        onJoin={handleJoin}
        busy={busy}
        error={homeError}
        initialUsername={loadUsername()}
        initialRoomCode={(params.get("room") ?? "").toUpperCase()}
      />
    );
  }

  if (!snapshot) {
    return <ConnectingScreen reconnecting={status === "reconnecting"} />;
  }

  return (
    <div className="relative min-h-full">
      {status === "reconnecting" && (
        <div className="fixed inset-x-0 top-0 z-50 bg-amber-500/90 py-1 text-center text-sm font-semibold text-stage-950">
          Reconnecting...
        </div>
      )}
      <button
        type="button"
        onClick={toggleSound}
        className="fixed bottom-3 right-3 z-40 rounded-full border border-royal-400/30 bg-stage-900/85 px-3 py-2 text-xs font-semibold text-slate-200 backdrop-blur transition hover:border-gold-400/60"
      >
        Sound {soundEnabled ? "On" : "Off"}
      </button>
      <GameView
        state={snapshot}
        myPlayerId={sock.myPlayerId}
        selected={selected}
        serverOffset={serverOffset}
        copied={copied}
        handlers={{
          onStart: () => send({ type: "START_GAME" }),
          onSelect: handleSelect,
          onPlayAgain: () => {
            setSelected(null);
            send({ type: "PLAY_AGAIN" });
          },
          onLeave: handleLeave,
          onCopyInvite: handleCopyInvite,
        }}
      />
    </div>
  );
}

function ConnectingScreen({ reconnecting }: { reconnecting: boolean }) {
  return (
    <StageShell className="items-center justify-center">
      <Logo size="md" />
      <p className="mt-4 animate-pulse text-slate-300">
        {reconnecting ? "Reconnecting to the room..." : "Entering the room..."}
      </p>
    </StageShell>
  );
}
