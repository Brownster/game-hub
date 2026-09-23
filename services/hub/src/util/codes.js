import { customAlphabet } from "nanoid";

// Confusable characters (I, O, 0, 1) are excluded so codes can be read aloud.
export const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const JOIN_CODE_LENGTH = 4;

const nanoid = customAlphabet(JOIN_CODE_ALPHABET, JOIN_CODE_LENGTH);

export function generateJoinCode() {
  return nanoid();
}
