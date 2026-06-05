// Joins a room as a guest and auto-answers each round. For manual e2e testing.
// Usage: node scripts/guest.mjs <ROOMCODE> <username> <answer A|B|C|D>
const [, , code, username = "Sam", answer = "B"] = process.argv;
const BASE = "http://127.0.0.1:8787";
const WS_BASE = "ws://127.0.0.1:8787";

const guest = await (
  await fetch(`${BASE}/api/rooms/${code}/join`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  })
).json();
console.log("joined", code, "as", username, guest.playerId?.slice(0, 6));

const ws = new WebSocket(
  `${WS_BASE}/api/rooms/${code}/ws?playerId=${guest.playerId}&token=${guest.token}`,
);
let answeredRound = -1;
ws.addEventListener("message", (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type !== "STATE_SNAPSHOT") return;
  const s = msg.state;
  if (s.phase === "question" && s.roundNumber !== answeredRound) {
    answeredRound = s.roundNumber;
    setTimeout(
      () => ws.send(JSON.stringify({ type: "SUBMIT_ANSWER", answer })),
      400,
    );
    console.log(`round ${s.roundNumber}: answering ${answer}`);
  }
  if (s.phase === "finished") {
    const winners = s.players
      .filter((p) => s.winnerPlayerIds.includes(p.playerId))
      .map((p) => p.username);
    console.log("finished. winner(s):", winners.join(", ") || "(none)");
  }
});
ws.addEventListener("open", () => console.log("guest ws open"));
setTimeout(() => process.exit(0), 120_000);
