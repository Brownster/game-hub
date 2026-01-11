import test from "node:test";
import assert from "node:assert/strict";

test("generateJoinCode returns 4-char code from expected alphabet", async (t) => {
  let generateJoinCode;
  try {
    ({ generateJoinCode } = await import("../src/util/codes.js"));
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND") {
      t.skip("nanoid dependency not installed");
      return;
    }
    throw err;
  }

  const code = generateJoinCode();
  assert.equal(code.length, 4);
  assert.match(code, /^[A-HJ-NP-Z2-9]{4}$/);
});
