import { useEffect, useMemo, useRef, useState } from "react";
import type { ClientRoomState } from "@mr/shared";

const KEY = "mr_sound_enabled_v1";

function loadEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

function tone(freq: number, durationMs: number, type: OscillatorType = "sine") {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  const ctx = new AudioContextClass();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000 + 0.03);
  setTimeout(() => void ctx.close(), durationMs + 120);
}

export function useSoundCues(state: ClientRoomState | null) {
  const [enabled, setEnabled] = useState(loadEnabled);
  const previousPhase = useRef<string | null>(null);
  const previousLocked = useRef<Record<string, boolean>>({});

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(enabled));
    } catch {
      // ignore storage failures
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !state) return;

    if (previousPhase.current !== state.phase) {
      if (state.phase === "question") tone(660, 120, "triangle");
      if (state.phase === "reveal") tone(220, 420, "sawtooth");
      if (state.phase === "finished") {
        tone(523, 120, "triangle");
        setTimeout(() => tone(659, 120, "triangle"), 120);
        setTimeout(() => tone(784, 220, "triangle"), 240);
      }
      previousPhase.current = state.phase;
    }

    for (const p of state.players) {
      const wasLocked = previousLocked.current[p.playerId] ?? false;
      if (p.answerLocked && !wasLocked) tone(440, 80, "square");
      previousLocked.current[p.playerId] = p.answerLocked;
    }
  }, [enabled, state]);

  return useMemo(
    () => ({
      soundEnabled: enabled,
      toggleSound: () => setEnabled((value) => !value),
    }),
    [enabled],
  );
}

