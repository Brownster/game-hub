import test from "node:test";
import assert from "node:assert/strict";
import {
  checkGuess,
  isValidWord,
  normalizeGuess,
  pickRandomWord,
  WORD_LENGTH,
} from "../src/games/wordle/wordleUtils.js";

test("wordleUtils: normalizeGuess cleans input", () => {
  assert.equal(normalizeGuess("  a!b c "), "ABC");
});

test("wordleUtils: isValidWord checks dictionary", () => {
  assert.equal(isValidWord("ABOUT"), true);
  assert.equal(isValidWord("ZZZZZ"), false);
});

test("wordleUtils: pickRandomWord returns a valid word", () => {
  const word = pickRandomWord();
  assert.equal(word.length, WORD_LENGTH);
  assert.equal(isValidWord(word), true);
});

test("wordleUtils: checkGuess handles duplicates", () => {
  const result = checkGuess("ALLEY", "APPLE");
  assert.deepEqual(result, ["correct", "present", "absent", "present", "absent"]);
});
