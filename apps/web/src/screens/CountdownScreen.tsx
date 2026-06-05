import type { ClientRoomState } from "@mr/shared";
import { useNow } from "../hooks/useNow.js";
import { StageShell } from "../components/StageShell.js";

export function CountdownScreen({
  state,
  serverOffset = 0,
}: {
  state: ClientRoomState;
  serverOffset?: number;
}) {
  const now = useNow(100) + serverOffset;
  const remaining = state.timerEndsAt
    ? Math.max(0, state.timerEndsAt - now)
    : 0;
  const count = Math.max(1, Math.ceil(remaining / 1000));

  return (
    <StageShell className="items-center justify-center">
      <p className="text-center text-lg uppercase tracking-[0.3em] text-slate-300">
        Get ready
      </p>
      <div
        key={count}
        className="mr-pop text-center text-[8rem] leading-none font-bold text-gold-300"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {count}
      </div>
      <p className="text-center text-slate-400">First question coming up...</p>
    </StageShell>
  );
}
