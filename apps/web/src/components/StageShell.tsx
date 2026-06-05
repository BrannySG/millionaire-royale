import type { ReactNode } from "react";
import { cx } from "../lib/cx.js";

export function StageShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-full w-full flex justify-center px-4 py-6 sm:py-10">
      <div
        className={cx(
          "w-full max-w-3xl flex flex-col gap-6",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function Panel({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-royal-400/30 bg-stage-800/70 backdrop-blur-sm",
        "shadow-[0_10px_40px_-12px_rgba(2,6,15,0.9)]",
        glow && "ring-1 ring-gold-400/30",
        className,
      )}
    >
      {children}
    </div>
  );
}
