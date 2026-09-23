import test from "node:test";
import assert from "node:assert/strict";
import { generateJoinCode, JOIN_CODE_LENGTH } from "../src/util/codes.js";
import { isValidJoinCode } from "../src/util/inputValidation.js";

// Regression guard: the join-code validator once required 6 characters while the
// generator produced 4, which silently broke every room join over the socket.
// These tests fail if the two ever drift apart again.

test("join code contract: generated codes always pass validation", () => {
  for (let i = 0; i < 500; i += 1) {
    const code = generateJoinCode();
    assert.equal(code.length, JOIN_CODE_LENGTH, `unexpected length for ${code}`);
    assert.ok(isValidJoinCode(code), `generator produced a code the validator rejects: ${code}`);
  }
});

test("join code contract: validator rejects malformed codes", () => {
  assert.ok(!isValidJoinCode(""), "empty string");
  assert.ok(!isValidJoinCode(null), "null");
  assert.ok(!isValidJoinCode("abc"), "lowercase and too short");
  assert.ok(!isValidJoinCode(generateJoinCode().toLowerCase()), "lowercase of a valid code");
  assert.ok(!isValidJoinCode("ABC234"), "wrong length");
  assert.ok(!isValidJoinCode("IO01"), "confusable characters excluded from the alphabet");
  assert.ok(!isValidJoinCode("AB-2"), "punctuation");
});
