import type { JoinResponse } from "@mr/shared";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as
    | (T & { error?: string })
    | { error?: string }
    | null;
  if (!res.ok) {
    const message =
      (data && "error" in data && data.error) || "Something went wrong";
    throw new Error(message);
  }
  return data as T;
}

export function createRoom(username: string): Promise<JoinResponse> {
  return postJson<JoinResponse>("/api/rooms", { username });
}

export function joinRoom(
  roomCode: string,
  username: string,
  existingPlayerId?: string,
): Promise<JoinResponse> {
  return postJson<JoinResponse>(
    `/api/rooms/${encodeURIComponent(roomCode)}/join`,
    { username, existingPlayerId },
  );
}
