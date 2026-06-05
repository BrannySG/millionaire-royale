import { useState } from "react";
import type { AnswerKey, GamePhase } from "@mr/shared";
import { HomeScreen } from "./screens/HomeScreen.js";
import { GameView } from "./screens/GameView.js";
import { fakeState, MY_ID } from "./devData.js";

// Static prototype harness: renders every screen with fake data.
// Reachable at /?preview for design review without a backend.

const PHASES: GamePhase[] = [
  "lobby",
  "countdown",
  "question",
  "reveal",
  "elimination",
  "finished",
];

export function Preview() {
  const [view, setView] = useState<"home" | GamePhase>("home");
  const [selected, setSelected] = useState<AnswerKey | null>(null);

  return (
    <div className="relative min-h-full">
      <div className="fixed inset-x-0 top-0 z-50 flex flex-wrap items-center gap-1 bg-black/60 px-2 py-1.5 text-xs backdrop-blur">
        <span className="mr-2 font-semibold text-gold-400">PREVIEW</span>
        <button
          onClick={() => setView("home")}
          className={`rounded px-2 py-1 ${view === "home" ? "bg-gold-400 text-black" : "bg-white/10 text-white"}`}
        >
          home
        </button>
        {PHASES.map((p) => (
          <button
            key={p}
            onClick={() => setView(p)}
            className={`rounded px-2 py-1 ${view === p ? "bg-gold-400 text-black" : "bg-white/10 text-white"}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="pt-12">
        {view === "home" ? (
          <HomeScreen
            onCreate={() => setView("lobby")}
            onJoin={() => setView("lobby")}
          />
        ) : (
          <GameView
            state={fakeState(view)}
            myPlayerId={MY_ID}
            selected={selected}
            serverOffset={0}
            copied={false}
            handlers={{
              onStart: () => setView("countdown"),
              onSelect: (a) => setSelected(a),
              onPlayAgain: () => setView("lobby"),
              onLeave: () => setView("home"),
              onCopyInvite: () => {},
            }}
          />
        )}
      </div>
    </div>
  );
}
