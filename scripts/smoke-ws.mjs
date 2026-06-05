// Manual end-to-end smoke test for the game loop. Requires `wrangler dev` on :8787.
// Run: node scripts/smoke-ws.mjs
const BASE = "http://127.0.0.1:8787";
const WS_BASE = "ws://127.0.0.1:8787";

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

function connect(code, who, onMsg) {
  const ws = new WebSocket(
    `${WS_BASE}/api/rooms/${code}/ws?playerId=${who.playerId}&token=${who.token}`,
  );
  ws.addEventListener("message", (e) => onMsg(JSON.parse(e.data)));
  return new Promise((resolve) => ws.addEventListener("open", () => resolve(ws)));
}

const seenPhases = new Set();

const host = await post("/api/rooms", { username: "Branny" });
const code = host.roomCode;
const guest = await post(`/api/rooms/${code}/join`, { username: "Sam" });
console.log("room", code, "host", host.playerId.slice(0, 6), "guest", guest.playerId.slice(0, 6));

let finished = false;
let answered = false;

function handle(tag, ws, answer) {
  return (msg) => {
    if (msg.type === "STATE_SNAPSHOT") {
      const s = msg.state;
      if (!seenPhases.has(s.phase)) {
        seenPhases.add(s.phase);
        console.log(`[phase] ${s.phase}` + (s.revealedCorrectAnswer ? ` (correct=${s.revealedCorrectAnswer})` : ""));
      }
      if (s.phase === "question" && !answered && tag === "guest") answered = true;
      if (s.phase === "question") ws.send(JSON.stringify({ type: "SUBMIT_ANSWER", answer }));
      if (s.phase === "finished" && !finished) {
        finished = true;
        const winners = s.players.filter((p) => s.winnerPlayerIds.includes(p.playerId)).map((p) => p.username);
        console.log("WINNER(S):", winners.join(", ") || "(none)");
        console.log("final players:", s.players.map((p) => `${p.username}:${p.alive ? "alive" : "out"}`).join(", "));
        process.exit(0);
      }
    }
    if (msg.type === "ERROR") console.log(`[err ${tag}]`, msg.message);
  };
}

const hostWs = await connect(code, host, () => {});
const guestWs = await connect(code, guest, () => {});
hostWs.addEventListener("message", (e) => handle("host", hostWs, "A")(JSON.parse(e.data)));
guestWs.addEventListener("message", (e) => handle("guest", guestWs, "B")(JSON.parse(e.data)));

setTimeout(() => hostWs.send(JSON.stringify({ type: "START_GAME" })), 500);
setTimeout(() => {
  console.error("TIMED OUT without finishing");
  process.exit(1);
}, 60_000);
