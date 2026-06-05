import { cx } from "../lib/cx.js";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const scale =
    size === "lg"
      ? "text-5xl sm:text-6xl"
      : size === "sm"
        ? "text-xl"
        : "text-3xl sm:text-4xl";
  return (
    <div className={cx("text-center leading-none select-none", scale)}>
      <div
        className="font-semibold tracking-[0.18em] uppercase"
        style={{ fontFamily: "var(--font-display)" }}
      >
        <span className="bg-gradient-to-b from-gold-300 to-gold-600 bg-clip-text text-transparent drop-shadow-[0_2px_12px_rgba(245,197,24,0.35)]">
          Millionaire
        </span>
      </div>
      <div
        className="mt-1 font-semibold tracking-[0.42em] uppercase text-slate-200"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Royale
      </div>
    </div>
  );
}
