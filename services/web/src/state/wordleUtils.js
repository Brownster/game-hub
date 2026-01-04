export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export function normalizeGuess(guess) {
  return String(guess || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
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

export function getKeyboardStatus(guesses, results) {
  const status = {};

  guesses.forEach((guess, row) => {
    const rowResults = results[row] || [];
    guess.split("").forEach((letter, idx) => {
      const next = rowResults[idx];
      if (!next) return;

      if (next === "correct") {
        status[letter] = "correct";
      } else if (next === "present" && status[letter] !== "correct") {
        status[letter] = "present";
      } else if (next === "absent" && !status[letter]) {
        status[letter] = "absent";
      }
    });
  });

  return status;
}
