import type { GameRoom } from "./GameRoom.js";

export interface Env {
  GAME_ROOM: DurableObjectNamespace<GameRoom>;
  DB: D1Database;
  ASSETS: Fetcher;
}
