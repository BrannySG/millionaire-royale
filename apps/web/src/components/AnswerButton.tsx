import type { AnswerKey } from "@mr/shared";
import { cx } from "../lib/cx.js";

export type AnswerVisualState =
  | "idle"
  | "selected"
  | "correct"
  | "wrong"
  | "dimmed";

export function AnswerButton({
  letter,
  text,
  state = "idle",
  disabled,
  onClick,
}: {
  letter: AnswerKey;
  text: string;
  state?: AnswerVisualState;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const palette: Record<AnswerVisualState, string> = {
    idle: "border-royal-400/40 bg-stage-700/50 hover:border-gold-400/70 hover:bg-stage-700",
    selected:
      "border-gold-400 bg-stage-700 ring-2 ring-gold-400/60 shadow-[0_0_24px_-6px_rgba(245,197,24,0.7)]",
    correct:
      "border-emerald-400 bg-emerald-500/20 ring-2 ring-emerald-400/70 shadow-[0_0_28px_-6px_rgba(16,185,129,0.7)]",
    wrong: "border-red-500 bg-red-500/20 ring-2 ring-red-500/60",
    dimmed: "border-royal-400/20 bg-stage-800/40 opacity-50",
  };
  const badgePalette: Record<AnswerVisualState, string> = {
    idle: "bg-stage-900 text-gold-400 border border-gold-400/40",
    selected: "bg-gold-400 text-stage-950",
    correct: "bg-emerald-400 text-stage-950",
    wrong: "bg-red-500 text-white",
    dimmed: "bg-stage-900 text-slate-400 border border-slate-600/40",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "group flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition-all duration-150",
        "disabled:cursor-default active:enabled:scale-[0.99]",
        palette[state],
      )}
    >
      <span
        className={cx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-lg font-bold",
          badgePalette[state],
        )}
        style={{ fontFamily: "var(--font-display)" }}
      >
        {letter}
      </span>
      <span className="text-base sm:text-lg font-medium text-slate-50">
        {text}
      </span>
    </button>
  );
}
