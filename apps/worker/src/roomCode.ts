import { ROOM } from "@mr/shared";

/** Generate a short, human-readable room code using a confusion-free alphabet. */
export function generateRoomCode(length: number = ROOM.codeLength): string {
  const alphabet = ROOM.codeAlphabet;
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return code;
}

const CODE_REGEX = new RegExp(`^[${ROOM.codeAlphabet}]{4,8}$`);

export function isValidRoomCodeFormat(code: string): boolean {
  return CODE_REGEX.test(code);
}

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase();
}
