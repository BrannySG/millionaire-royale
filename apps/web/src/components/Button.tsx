import type { ButtonHTMLAttributes } from "react";
import { cx } from "../lib/cx.js";

type Variant = "gold" | "ghost" | "royal";

export function Button({
  variant = "gold",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold tracking-wide transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]";
  const styles: Record<Variant, string> = {
    gold: "bg-gradient-to-b from-gold-400 to-gold-600 text-stage-950 shadow-[0_8px_24px_-8px_rgba(245,197,24,0.6)] hover:from-gold-300 hover:to-gold-500",
    royal:
      "bg-gradient-to-b from-royal-400 to-royal-500 text-white hover:brightness-110",
    ghost:
      "border border-royal-400/40 bg-stage-700/40 text-slate-100 hover:bg-stage-700/70",
  };
  return <button className={cx(base, styles[variant], className)} {...props} />;
}
