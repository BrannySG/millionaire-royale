import { DurableObject } from "cloudflare:workers";
import {
  ERROR_CODES,
  ROOM,
  TIMERS,
  type AnswerKey,
  type ClientRoomState,
  type GamePhase,
  type PlayerState,
  type RoomState,
  type ServerMessage,
} from "@mr/shared";
import type { Env } from "./env.js";
import { parseClientMessage } from "./messages.js";
import { sanitizeUsername } from "./validation.js";
import { pickUnusedQuestion, toPublicQuestion } from "./questions.js";
import { recordGameEvent, recordGameResult } from "./d1.js";

type SocketAttachment = { playerId: string };

const ROOM_STATE_KEY = "roomState";
const TOKENS_KEY = "tokens";

/**
 * One Durable Object instance per room. This is the single authoritative
 * coordinator for the room: it owns all state, decides correctness,
 * eliminations, phase transitions and the winner. Clients only send actions
 * and render snapshots.
 */
export class GameRoom extends DurableObject<Env> {
  private state: RoomState | undefined;
  private tokens: Record<string, string> = {};

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.state = await this.ctx.storage.get<RoomState>(ROOM_STATE_KEY);
      this.tokens =
        (await this.ctx.storage.get<Record<string, string>>(TOKENS_KEY)) ?? {};
    });
  }

  // ----- HTTP entrypoints (called internally by the Worker) ----------------

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.endsWith("/create")) return this.handleCreate(request);
    if (path.endsWith("/join")) return this.handleJoin(request);
    if (path.endsWith("/ws")) return this.handleWebSocketUpgrade(request, url);
    return new Response("Not found", { status: 404 });
  }

  private async handleCreate(request: Request): Promise<Response> {
    if (this.state) {
      return json({ error: "Room already exists", code: "ROOM_EXISTS" }, 409);
    }
    const body = (await request.json().catch(() => null)) as {
      username?: unknown;
      roomCode?: unknown;
    } | null;
    const username = sanitizeUsername(body?.username);
    const roomCode =
      typeof body?.roomCode === "string" ? body.roomCode : null;
    if (!username || !roomCode) {
      return json(
        { error: "Invalid username", code: ERROR_CODES.INVALID_USERNAME },
        400,
      );
    }

    const now = Date.now();
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    const host: PlayerState = {
      playerId,
      username,
      alive: true,
      connected: false,
      isHost: true,
      joinedAt: now,
      lastSeenAt: now,
      answerLocked: false,
      lastAnswerCorrect: null,
    };
    this.state = {
      roomCode,
      phase: "lobby",
      hostPlayerId: playerId,
      players: { [playerId]: host },
      questionIndex: 0,
      currentQuestion: null,
      currentQuestionId: null,
      currentCorrectAnswer: null,
      lockedAnswers: {},
      timerEndsAt: null,
      roundNumber: 0,
      winnerPlayerId: null,
      winnerPlayerIds: [],
      usedQuestionIds: [],
      cleanupAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.tokens[playerId] = token;
    await this.persist();

    return json({ roomCode, playerId, token, isHost: true });
  }

  private async handleJoin(request: Request): Promise<Response> {
    if (!this.state) {
      return json(
        { error: "Room not found", code: ERROR_CODES.ROOM_NOT_FOUND },
        404,
      );
    }
    const body = (await request.json().catch(() => null)) as {
      username?: unknown;
      existingPlayerId?: unknown;
    } | null;

    // Reconnect path: existing player rejoins (any phase).
    const existingId =
      typeof body?.existingPlayerId === "string"
        ? body.existingPlayerId
        : null;
    if (existingId && this.state.players[existingId]) {
      const player = this.state.players[existingId];
      player.lastSeenAt = Date.now();
      let token = this.tokens[existingId];
      if (!token) {
        token = crypto.randomUUID();
        this.tokens[existingId] = token;
      }
      await this.persist();
      return json({
        roomCode: this.state.roomCode,
        playerId: existingId,
        token,
        isHost: player.isHost,
      });
    }

    // New player path.
    const username = sanitizeUsername(body?.username);
    if (!username) {
      return json(
        { error: "Invalid username", code: ERROR_CODES.INVALID_USERNAME },
        400,
      );
    }
    if (this.state.phase === "finished") {
      return json(
        { error: "Game is over", code: ERROR_CODES.ROOM_FINISHED },
        409,
      );
    }
    if (this.state.phase !== "lobby") {
      return json(
        {
          error: "Game already started",
          code: ERROR_CODES.ROOM_ALREADY_STARTED,
        },
        409,
      );
    }
    if (Object.keys(this.state.players).length >= ROOM.maxPlayers) {
      return json({ error: "Room is full", code: ERROR_CODES.ROOM_FULL }, 409);
    }

    const now = Date.now();
    const playerId = crypto.randomUUID();
    const token = crypto.randomUUID();
    this.state.players[playerId] = {
      playerId,
      username,
      alive: true,
      connected: false,
      isHost: false,
      joinedAt: now,
      lastSeenAt: now,
      answerLocked: false,
      lastAnswerCorrect: null,
    };
    this.tokens[playerId] = token;
    await this.persist();
    this.broadcast();

    return json({
      roomCode: this.state.roomCode,
      playerId,
      token,
      isHost: false,
    });
  }

  private async handleWebSocketUpgrade(
    request: Request,
    url: URL,
  ): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket", { status: 426 });
    }
    if (!this.state) {
      return new Response("Room not found", { status: 404 });
    }
    const playerId = url.searchParams.get("playerId") ?? "";
    const token = url.searchParams.get("token") ?? "";
    const player = this.state.players[playerId];
    if (!player || this.tokens[playerId] !== token) {
      return new Response("Auth failed", { status: 401 });
    }

    // Drop any stale socket for this player (e.g. a refresh without a clean close).
    this.closeExistingSockets(playerId);

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ playerId } satisfies SocketAttachment);

    player.connected = true;
    player.lastSeenAt = Date.now();
    this.state.cleanupAt = null;
    if (!this.state.hostPlayerId) {
      this.assignHost();
    }
    await this.persist();

    send(server, {
      type: "ROOM_JOINED",
      roomCode: this.state.roomCode,
      playerId,
      isHost: player.isHost,
    });
    send(server, { type: "STATE_SNAPSHOT", state: this.buildClientState() });
    this.broadcast();
    await this.scheduleAlarm();

    return new Response(null, { status: 101, webSocket: client });
  }

  // ----- WebSocket lifecycle (hibernation API) -----------------------------

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (!this.state) return;
    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;
    const player = this.state.players[playerId];
    if (!player) return;
    player.lastSeenAt = Date.now();

    const raw = typeof message === "string" ? message : "";
    const msg = parseClientMessage(raw);
    if (!msg) {
      send(ws, {
        type: "ERROR",
        message: "Invalid message",
        code: ERROR_CODES.INVALID_PAYLOAD,
      });
      return;
    }

    switch (msg.type) {
      case "PING":
        send(ws, { type: "PONG", serverTime: Date.now() });
        return;
      case "START_GAME":
        await this.handleStartGame(playerId, ws);
        return;
      case "SUBMIT_ANSWER":
        await this.handleSubmitAnswer(playerId, msg.answer, ws);
        return;
      case "PLAY_AGAIN":
        await this.handlePlayAgain(playerId, ws);
        return;
      case "LEAVE_ROOM":
        await this.handleLeave(playerId, ws);
        return;
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    await this.handleSocketGone(ws);
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    await this.handleSocketGone(ws);
  }

  private async handleSocketGone(ws: WebSocket): Promise<void> {
    if (!this.state) return;
    const attachment = ws.deserializeAttachment() as SocketAttachment | null;
    const playerId = attachment?.playerId;
    if (!playerId) return;
    const player = this.state.players[playerId];
    if (!player) return;

    // Only flip to disconnected if this player has no other open socket.
    const stillOpen = this.socketsFor(playerId).some((s) => s !== ws);
    if (!stillOpen) {
      player.connected = false;
      player.lastSeenAt = Date.now();
      if (player.isHost) this.reassignHostIfNeeded(playerId);
      if (this.connectedCount() === 0) {
        this.state.cleanupAt = Date.now() + TIMERS.emptyRoomCleanupMs;
      }
    }
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  // ----- Host actions ------------------------------------------------------

  private async handleStartGame(playerId: string, ws: WebSocket): Promise<void> {
    const s = this.state!;
    if (s.hostPlayerId !== playerId) {
      return send(ws, errorMsg("Only the host can start", ERROR_CODES.NOT_HOST));
    }
    if (s.phase !== "lobby") {
      return send(ws, errorMsg("Game already started", ERROR_CODES.WRONG_PHASE));
    }
    if (Object.keys(s.players).length < ROOM.minPlayers) {
      return send(
        ws,
        errorMsg(
          `Need at least ${ROOM.minPlayers} players`,
          ERROR_CODES.NOT_ENOUGH_PLAYERS,
        ),
      );
    }

    for (const p of Object.values(s.players)) {
      p.alive = true;
      p.answerLocked = false;
      p.lastAnswerCorrect = null;
    }
    s.usedQuestionIds = [];
    s.roundNumber = 0;
    s.questionIndex = 0;
    s.winnerPlayerId = null;
    s.winnerPlayerIds = [];
    s.lockedAnswers = {};
    void recordGameEvent(this.env, {
      roomCode: s.roomCode,
      eventType: "GAME_STARTED",
      payload: { playerCount: Object.keys(s.players).length },
    });
    await this.startCountdown();
  }

  private async handlePlayAgain(playerId: string, ws: WebSocket): Promise<void> {
    const s = this.state!;
    if (s.hostPlayerId !== playerId) {
      return send(ws, errorMsg("Only the host can restart", ERROR_CODES.NOT_HOST));
    }
    if (s.phase !== "finished") {
      return send(ws, errorMsg("Game is not finished", ERROR_CODES.WRONG_PHASE));
    }
    for (const p of Object.values(s.players)) {
      p.alive = true;
      p.answerLocked = false;
      p.lastAnswerCorrect = null;
    }
    s.phase = "lobby";
    s.currentQuestion = null;
    s.currentQuestionId = null;
    s.currentCorrectAnswer = null;
    s.lockedAnswers = {};
    s.usedQuestionIds = [];
    s.roundNumber = 0;
    s.questionIndex = 0;
    s.winnerPlayerId = null;
    s.winnerPlayerIds = [];
    s.timerEndsAt = null;
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  // ----- Answering ---------------------------------------------------------

  private async handleSubmitAnswer(
    playerId: string,
    answer: AnswerKey,
    ws: WebSocket,
  ): Promise<void> {
    const s = this.state!;
    if (s.phase !== "question") {
      return send(ws, errorMsg("Not accepting answers", ERROR_CODES.WRONG_PHASE));
    }
    const player = s.players[playerId];
    if (!player.alive) {
      return send(ws, errorMsg("You are eliminated", ERROR_CODES.NOT_ALIVE));
    }
    if (player.answerLocked) {
      return send(ws, errorMsg("Already locked in", ERROR_CODES.ALREADY_ANSWERED));
    }
    s.lockedAnswers[playerId] = { playerId, answer, lockedAt: Date.now() };
    player.answerLocked = true;
    await this.persist();
    this.broadcast();

    // Early reveal once every alive player has locked an answer.
    if (this.allAlivePlayersLocked()) {
      await this.startReveal();
    }
  }

  // ----- Phase machine -----------------------------------------------------

  private async startCountdown(): Promise<void> {
    const s = this.state!;
    s.phase = "countdown";
    s.currentQuestion = null;
    s.currentQuestionId = null;
    s.currentCorrectAnswer = null;
    s.lockedAnswers = {};
    s.timerEndsAt = Date.now() + TIMERS.countdownMs;
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  private async advanceToNextQuestionOrFinish(): Promise<void> {
    const s = this.state!;
    const aliveIds = this.alivePlayerIds();
    if (aliveIds.length <= 1) {
      await this.finishGame(aliveIds);
      return;
    }
    const q = pickUnusedQuestion(s.usedQuestionIds);
    if (!q) {
      // Bank exhausted with multiple survivors: declare co-winners.
      await this.finishGame(aliveIds);
      return;
    }
    s.roundNumber += 1;
    s.questionIndex += 1;
    s.usedQuestionIds.push(q.id);
    s.currentQuestion = toPublicQuestion(q);
    s.currentQuestionId = q.id;
    s.currentCorrectAnswer = q.correctAnswer;
    s.lockedAnswers = {};
    for (const p of Object.values(s.players)) {
      if (p.alive) {
        p.answerLocked = false;
        p.lastAnswerCorrect = null;
      }
    }
    s.phase = "question";
    s.timerEndsAt = Date.now() + TIMERS.questionMs;
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  private async startReveal(): Promise<void> {
    const s = this.state!;
    for (const p of Object.values(s.players)) {
      if (!p.alive) continue;
      const locked = s.lockedAnswers[p.playerId];
      p.lastAnswerCorrect = locked
        ? locked.answer === s.currentCorrectAnswer
        : false;
    }
    s.phase = "reveal";
    s.timerEndsAt = Date.now() + TIMERS.revealMs;
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  private async startElimination(): Promise<void> {
    const s = this.state!;
    const aliveIds = this.alivePlayerIds();
    const wrongIds = aliveIds.filter(
      (id) => s.players[id].lastAnswerCorrect !== true,
    );
    // Forgiveness rule: if everyone got it wrong, nobody is eliminated.
    const eliminateEveryone = wrongIds.length === aliveIds.length;
    if (!eliminateEveryone) {
      for (const id of wrongIds) {
        s.players[id].alive = false;
      }
    }
    void recordGameEvent(this.env, {
      roomCode: s.roomCode,
      eventType: "ELIMINATION",
      payload: {
        round: s.roundNumber,
        eliminated: eliminateEveryone ? [] : wrongIds,
        forgiven: eliminateEveryone,
        remaining: this.alivePlayerIds().length,
      },
    });
    s.phase = "elimination";
    s.timerEndsAt = Date.now() + TIMERS.eliminationMs;
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  private async finishGame(winnerIds: string[]): Promise<void> {
    const s = this.state!;
    s.phase = "finished";
    s.winnerPlayerIds = winnerIds;
    s.winnerPlayerId = winnerIds.length === 1 ? winnerIds[0] : null;
    s.currentQuestion = null;
    s.currentQuestionId = null;
    s.currentCorrectAnswer = null;
    s.lockedAnswers = {};
    s.timerEndsAt = null;
    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();

    const winnerUsername =
      winnerIds.length === 1
        ? (s.players[winnerIds[0]]?.username ?? null)
        : winnerIds.length > 1
          ? winnerIds.map((id) => s.players[id]?.username).join(", ")
          : null;
    this.ctx.waitUntil(
      recordGameResult(this.env, {
        roomCode: s.roomCode,
        winnerUsername,
        playerCount: Object.keys(s.players).length,
        roundsPlayed: s.roundNumber,
      }),
    );
  }

  // ----- Alarm (server-side timing) ----------------------------------------

  async alarm(): Promise<void> {
    if (!this.state) return;
    const s = this.state;
    const now = Date.now();

    if (
      s.cleanupAt !== null &&
      now >= s.cleanupAt &&
      this.connectedCount() === 0
    ) {
      await this.destroyRoom();
      return;
    }

    if (
      s.timerEndsAt !== null &&
      now >= s.timerEndsAt &&
      phaseHasDeadline(s.phase)
    ) {
      switch (s.phase) {
        case "countdown":
          await this.advanceToNextQuestionOrFinish();
          break;
        case "question":
          await this.startReveal();
          break;
        case "reveal":
          await this.startElimination();
          break;
        case "elimination":
          await this.advanceToNextQuestionOrFinish();
          break;
        default:
          break;
      }
      return;
    }

    await this.scheduleAlarm();
  }

  private async scheduleAlarm(): Promise<void> {
    const s = this.state;
    if (!s) return;
    const candidates: number[] = [];
    if (s.timerEndsAt !== null && phaseHasDeadline(s.phase)) {
      candidates.push(s.timerEndsAt);
    }
    if (s.cleanupAt !== null) candidates.push(s.cleanupAt);
    if (candidates.length === 0) {
      await this.ctx.storage.deleteAlarm();
      return;
    }
    await this.ctx.storage.setAlarm(Math.min(...candidates));
  }

  private async destroyRoom(): Promise<void> {
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.close(1000, "Room closed");
      } catch {
        // ignore
      }
    }
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    this.state = undefined;
    this.tokens = {};
  }

  // ----- Leaving -----------------------------------------------------------

  private async handleLeave(playerId: string, ws: WebSocket): Promise<void> {
    const s = this.state!;
    delete s.players[playerId];
    delete this.tokens[playerId];
    if (s.hostPlayerId === playerId) {
      s.hostPlayerId = null;
      this.assignHost();
    }
    try {
      ws.close(1000, "Left room");
    } catch {
      // ignore
    }

    if (Object.keys(s.players).length === 0) {
      s.cleanupAt = Date.now() + TIMERS.emptyRoomCleanupMs;
      await this.persist();
      this.broadcast();
      await this.scheduleAlarm();
      return;
    }

    // If a departure leaves the game un-winnable, resolve it.
    if (
      s.phase === "question" ||
      s.phase === "countdown" ||
      s.phase === "reveal" ||
      s.phase === "elimination"
    ) {
      const aliveIds = this.alivePlayerIds();
      if (aliveIds.length <= 1) {
        await this.finishGame(aliveIds);
        return;
      }
      if (s.phase === "question" && this.allAlivePlayersLocked()) {
        await this.startReveal();
        return;
      }
    }

    await this.persist();
    this.broadcast();
    await this.scheduleAlarm();
  }

  // ----- Helpers -----------------------------------------------------------

  private alivePlayerIds(): string[] {
    const s = this.state!;
    return Object.values(s.players)
      .filter((p) => p.alive)
      .map((p) => p.playerId);
  }

  private allAlivePlayersLocked(): boolean {
    const s = this.state!;
    const alive = Object.values(s.players).filter((p) => p.alive);
    if (alive.length === 0) return false;
    return alive.every((p) => p.answerLocked);
  }

  private connectedCount(): number {
    const s = this.state;
    if (!s) return 0;
    return Object.values(s.players).filter((p) => p.connected).length;
  }

  private assignHost(): void {
    const s = this.state!;
    if (s.hostPlayerId && s.players[s.hostPlayerId]) return;
    const players = Object.values(s.players).sort(
      (a, b) => a.joinedAt - b.joinedAt,
    );
    const next = players.find((p) => p.connected) ?? players[0];
    for (const p of players) p.isHost = false;
    if (next) {
      next.isHost = true;
      s.hostPlayerId = next.playerId;
    } else {
      s.hostPlayerId = null;
    }
  }

  private reassignHostIfNeeded(leavingHostId: string): void {
    const s = this.state!;
    if (s.hostPlayerId !== leavingHostId) return;
    const candidates = Object.values(s.players)
      .filter((p) => p.playerId !== leavingHostId && p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const next = candidates[0];
    if (next) {
      if (s.players[leavingHostId]) s.players[leavingHostId].isHost = false;
      next.isHost = true;
      s.hostPlayerId = next.playerId;
    }
  }

  private socketsFor(playerId: string): WebSocket[] {
    return this.ctx.getWebSockets().filter((ws) => {
      const a = ws.deserializeAttachment() as SocketAttachment | null;
      return a?.playerId === playerId;
    });
  }

  private closeExistingSockets(playerId: string): void {
    for (const ws of this.socketsFor(playerId)) {
      try {
        ws.close(1000, "Replaced by new connection");
      } catch {
        // ignore
      }
    }
  }

  private buildClientState(): ClientRoomState {
    const s = this.state!;
    const revealing =
      s.phase === "reveal" ||
      s.phase === "elimination" ||
      s.phase === "finished";
    const players = Object.values(s.players).sort(
      (a, b) => a.joinedAt - b.joinedAt,
    );
    return {
      roomCode: s.roomCode,
      phase: s.phase,
      players,
      question: s.phase === "lobby" ? null : s.currentQuestion,
      timerEndsAt: s.timerEndsAt,
      roundNumber: s.roundNumber,
      revealedCorrectAnswer:
        revealing && s.currentCorrectAnswer
          ? s.currentCorrectAnswer
          : undefined,
      winnerPlayerId: s.winnerPlayerId,
      winnerPlayerIds: s.winnerPlayerIds,
    };
  }

  private broadcast(): void {
    if (!this.state) return;
    const payload: ServerMessage = {
      type: "STATE_SNAPSHOT",
      state: this.buildClientState(),
    };
    const data = JSON.stringify(payload);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
        // ignore broken sockets
      }
    }
  }

  private async persist(): Promise<void> {
    if (!this.state) return;
    this.state.updatedAt = Date.now();
    await this.ctx.storage.put(ROOM_STATE_KEY, this.state);
    await this.ctx.storage.put(TOKENS_KEY, this.tokens);
  }
}

function phaseHasDeadline(phase: GamePhase): boolean {
  return (
    phase === "countdown" ||
    phase === "question" ||
    phase === "reveal" ||
    phase === "elimination"
  );
}

function send(ws: WebSocket, msg: ServerMessage): void {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    // ignore
  }
}

function errorMsg(message: string, code: string): ServerMessage {
  return { type: "ERROR", message, code };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
