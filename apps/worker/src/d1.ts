import type { Env } from "./env.js";

/**
 * Persistence helpers. D1 is used only for durable records (results / events),
 * never for live room state. All writes are best-effort: a D1 outage must not
 * break gameplay, so failures are swallowed with a console warning.
 */

export async function recordGameResult(
  env: Env,
  result: {
    roomCode: string;
    winnerUsername: string | null;
    playerCount: number;
    roundsPlayed: number;
  },
): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      `INSERT INTO game_results (id, room_code, winner_username, player_count, rounds_played, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        result.roomCode,
        result.winnerUsername,
        result.playerCount,
        result.roundsPlayed,
        Date.now(),
      )
      .run();
  } catch (err) {
    console.warn("recordGameResult failed", err);
  }
}

export async function recordGameEvent(
  env: Env,
  event: {
    roomCode: string;
    eventType: string;
    payload?: unknown;
  },
): Promise<void> {
  if (!env.DB) return;
  try {
    await env.DB.prepare(
      `INSERT INTO game_events (id, room_code, event_type, payload_json, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        event.roomCode,
        event.eventType,
        event.payload === undefined ? null : JSON.stringify(event.payload),
        Date.now(),
      )
      .run();
  } catch (err) {
    console.warn("recordGameEvent failed", err);
  }
}
