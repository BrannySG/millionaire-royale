import { ERROR_CODES } from "@mr/shared";
import type { Env } from "./env.js";
import { generateRoomCode, isValidRoomCodeFormat, normalizeRoomCode } from "./roomCode.js";
import { sanitizeUsername } from "./validation.js";

export { GameRoom } from "./GameRoom.js";

const MAX_CREATE_ATTEMPTS = 8;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/api/")) {
      return handleApi(request, env, url);
    }

    // Everything else is the static SPA, served by the assets binding.
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleApi(
  request: Request,
  env: Env,
  url: URL,
): Promise<Response> {
  const { pathname } = url;

  // POST /api/rooms -> create a new room.
  if (pathname === "/api/rooms" && request.method === "POST") {
    return createRoom(request, env);
  }

  // /api/rooms/:code/join (POST) and /api/rooms/:code/ws (GET upgrade).
  const match = pathname.match(/^\/api\/rooms\/([^/]+)\/(join|ws)$/);
  if (match) {
    const code = normalizeRoomCode(decodeURIComponent(match[1]));
    const action = match[2];
    if (!isValidRoomCodeFormat(code)) {
      return apiError("Invalid room code", ERROR_CODES.ROOM_NOT_FOUND, 404);
    }
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));

    if (action === "join" && request.method === "POST") {
      const body = await request.text();
      return stub.fetch(
        new Request("https://do/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      );
    }

    if (action === "ws" && request.method === "GET") {
      return stub.fetch(
        new Request(`https://do/ws${url.search}`, {
          headers: request.headers,
        }),
      );
    }
  }

  return apiError("Not found", "NOT_FOUND", 404);
}

async function createRoom(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    username?: unknown;
  } | null;
  const username = sanitizeUsername(body?.username);
  if (!username) {
    return apiError(
      "Please enter a valid username",
      ERROR_CODES.INVALID_USERNAME,
      400,
    );
  }

  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(code));
    const res = await stub.fetch(
      new Request("https://do/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, roomCode: code }),
      }),
    );
    if (res.status === 409) {
      // Extremely rare code collision; try another code.
      continue;
    }
    return res;
  }

  return apiError(
    "Could not create a room, please try again",
    "ROOM_CODE_EXHAUSTED",
    500,
  );
}

function apiError(error: string, code: string, status: number): Response {
  return new Response(JSON.stringify({ error, code }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
