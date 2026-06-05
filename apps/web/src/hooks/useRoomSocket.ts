import { useCallback, useRef, useState } from "react";
import type { ClientMessage, ClientRoomState, ServerMessage } from "@mr/shared";
import type { Session } from "../lib/session.js";

export type ConnStatus =
  | "idle"
  | "connecting"
  | "open"
  | "reconnecting"
  | "closed";

const MAX_RECONNECT_ATTEMPTS = 6;
const PING_INTERVAL_MS = 10_000;

function wsUrl(session: Session): string {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  const params = new URLSearchParams({
    playerId: session.playerId,
    token: session.token,
  });
  return `${proto}//${location.host}/api/rooms/${encodeURIComponent(
    session.roomCode,
  )}/ws?${params.toString()}`;
}

export function useRoomSocket(options?: { onFatal?: () => void }) {
  const [snapshot, setSnapshot] = useState<ClientRoomState | null>(null);
  const [status, setStatus] = useState<ConnStatus>("idle");
  const [isHost, setIsHost] = useState(false);
  const [serverOffset, setServerOffset] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const manualClose = useRef(false);
  const everOpened = useRef(false);
  const attempts = useRef(0);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPingAt = useRef(0);
  const onFatal = options?.onFatal;

  const clearTimers = useCallback(() => {
    if (pingTimer.current) clearInterval(pingTimer.current);
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    pingTimer.current = null;
    reconnectTimer.current = null;
  }, []);

  const open = useCallback(
    (session: Session) => {
      const ws = new WebSocket(wsUrl(session));
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        everOpened.current = true;
        attempts.current = 0;
        setStatus("open");
        setLastError(null);
        lastPingAt.current = Date.now();
        ws.send(JSON.stringify({ type: "PING" } satisfies ClientMessage));
        pingTimer.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            lastPingAt.current = Date.now();
            ws.send(JSON.stringify({ type: "PING" } satisfies ClientMessage));
          }
        }, PING_INTERVAL_MS);
      });

      ws.addEventListener("message", (event) => {
        let msg: ServerMessage;
        try {
          msg = JSON.parse(event.data as string) as ServerMessage;
        } catch {
          return;
        }
        switch (msg.type) {
          case "ROOM_JOINED":
            setIsHost(msg.isHost);
            break;
          case "STATE_SNAPSHOT":
            setSnapshot(msg.state);
            break;
          case "PONG": {
            const rtt = Date.now() - lastPingAt.current;
            const estimatedServerNow = msg.serverTime + rtt / 2;
            setServerOffset(estimatedServerNow - Date.now());
            break;
          }
          case "ERROR":
            setLastError(msg.message);
            break;
        }
      });

      ws.addEventListener("close", () => {
        clearTimers();
        if (manualClose.current) {
          setStatus("closed");
          return;
        }
        // If we never connected, the session is probably stale/invalid.
        if (!everOpened.current) {
          attempts.current += 1;
          if (attempts.current >= 2) {
            setStatus("closed");
            onFatal?.();
            return;
          }
        }
        attempts.current += 1;
        if (attempts.current > MAX_RECONNECT_ATTEMPTS) {
          setStatus("closed");
          onFatal?.();
          return;
        }
        setStatus("reconnecting");
        const delay = Math.min(5000, 500 * 2 ** attempts.current);
        reconnectTimer.current = setTimeout(() => {
          if (sessionRef.current) open(sessionRef.current);
        }, delay);
      });
    },
    [clearTimers, onFatal],
  );

  const connect = useCallback(
    (session: Session) => {
      manualClose.current = false;
      everOpened.current = false;
      attempts.current = 0;
      sessionRef.current = session;
      setStatus("connecting");
      setSnapshot(null);
      open(session);
    },
    [open],
  );

  const disconnect = useCallback(() => {
    manualClose.current = true;
    clearTimers();
    sessionRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("closed");
    setSnapshot(null);
    setIsHost(false);
  }, [clearTimers]);

  const send = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  return {
    snapshot,
    status,
    isHost,
    serverOffset,
    lastError,
    myPlayerId: sessionRef.current?.playerId ?? null,
    connect,
    disconnect,
    send,
  };
}
