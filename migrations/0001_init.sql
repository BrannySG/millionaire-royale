-- Millionaire Royale initial schema.
-- D1 is used only for durable records, never for live room state.

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  category TEXT,
  difficulty TEXT,
  prompt TEXT NOT NULL,
  answer_a TEXT NOT NULL,
  answer_b TEXT NOT NULL,
  answer_c TEXT NOT NULL,
  answer_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_results (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  winner_username TEXT,
  player_count INTEGER NOT NULL,
  rounds_played INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS game_events (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_results_created_at ON game_results (created_at);
CREATE INDEX IF NOT EXISTS idx_game_events_room_code ON game_events (room_code);
