import { WORDS, WORD_SET } from "./words.js";

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export function normalizeGuess(guess) {
  return String(guess || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

export function isValidWord(word) {
  return WORD_SET.has(word);
}

export function pickRandomWord() {
  const idx = Math.floor(Math.random() * WORDS.length);
  return WORDS[idx];
}

export function checkGuess(guess, answer) {
  const result = Array(WORD_LENGTH).fill("absent");
  const counts = {};

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    const a = answer[i];
    const g = guess[i];
    if (g === a) {
      result[i] = "correct";
    } else {
      counts[a] = (counts[a] || 0) + 1;
    }
  }

  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (result[i] === "correct") continue;
    const g = guess[i];
    if (counts[g]) {
      result[i] = "present";
      counts[g] -= 1;
    }
  }

  return result;
}
