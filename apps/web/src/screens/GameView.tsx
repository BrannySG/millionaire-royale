import type { AnswerKey, ClientRoomState } from "@mr/shared";
import { LobbyScreen } from "./LobbyScreen.js";
import { CountdownScreen } from "./CountdownScreen.js";
import { QuestionScreen } from "./QuestionScreen.js";
import { RevealScreen } from "./RevealScreen.js";
import { EliminationScreen } from "./EliminationScreen.js";
import { WinnerScreen } from "./WinnerScreen.js";

export type GameViewHandlers = {
  onStart: () => void;
  onSelect: (answer: AnswerKey) => void;
  onPlayAgain: () => void;
  onLeave: () => void;
  onCopyInvite: () => void;
};

export function GameView({
  state,
  myPlayerId,
  selected,
  serverOffset,
  copied,
  handlers,
}: {
  state: ClientRoomState;
  myPlayerId?: string | null;
  selected: AnswerKey | null;
  serverOffset: number;
  copied?: boolean;
  handlers: GameViewHandlers;
}) {
  switch (state.phase) {
    case "lobby":
      return (
        <LobbyScreen
          state={state}
          myPlayerId={myPlayerId}
          onStart={handlers.onStart}
          onLeave={handlers.onLeave}
          onCopyInvite={handlers.onCopyInvite}
          copied={copied}
        />
      );
    case "countdown":
      return <CountdownScreen state={state} serverOffset={serverOffset} />;
    case "question":
      return (
        <QuestionScreen
          state={state}
          myPlayerId={myPlayerId}
          selected={selected}
          onSelect={handlers.onSelect}
          serverOffset={serverOffset}
        />
      );
    case "reveal":
      return (
        <RevealScreen
          state={state}
          myPlayerId={myPlayerId}
          mySelected={selected}
        />
      );
    case "elimination":
      return (
        <EliminationScreen
          state={state}
          myPlayerId={myPlayerId}
          serverOffset={serverOffset}
        />
      );
    case "finished":
      return (
        <WinnerScreen
          state={state}
          myPlayerId={myPlayerId}
          onPlayAgain={handlers.onPlayAgain}
          onLeave={handlers.onLeave}
        />
      );
    default:
      return null;
  }
}
