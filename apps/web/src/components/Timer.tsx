import { useNow } from "../hooks/useNow.js";
import { cx } from "../lib/cx.js";

export function Timer({
  endsAt,
  totalMs,
  serverOffset = 0,
}: {
  endsAt: number | null;
  totalMs: number;
  serverOffset?: number;
}) {
  const now = useNow(100) + serverOffset;
  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const ratio = endsAt ? Math.max(0, Math.min(1, remainingMs / totalMs)) : 0;
  const urgent = remainingMs <= 5000 && remainingMs > 0;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cx(
          "text-5xl font-bold tabular-nums",
          urgent ? "text-red-400 animate-pulse" : "text-gold-400",
        )}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {seconds}
      </div>
      <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-stage-700">
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-100 ease-linear",
            urgent
              ? "bg-gradient-to-r from-red-500 to-red-400"
              : "bg-gradient-to-r from-gold-500 to-gold-300",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
