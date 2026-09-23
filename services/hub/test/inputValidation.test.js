import { describe, it } from "node:test";
import assert from "node:assert";
import {
  isValidPlayerId,
  isValidDisplayName,
  isValidJoinCode,
  isValidPassword,
  isValidActionType,
  isValidInteger,
  isValidUUID,
  isValidGameKey,
  isValidGameMode,
  isValidChatMessage,
} from "../src/util/inputValidation.js";

describe("Input Validation", () => {
  describe("isValidPlayerId", () => {
    it("should accept valid UUIDs", () => {
      assert.ok(isValidPlayerId("550e8400-e29b-41d4-a716-446655440000"));
      assert.ok(isValidPlayerId("123e4567-e89b-12d3-a456-426614174000"));
    });

    it("should accept valid alphanumeric IDs", () => {
      assert.ok(isValidPlayerId("player123"));
      assert.ok(isValidPlayerId("user_test-123"));
    });

    it("should reject invalid IDs", () => {
      assert.ok(!isValidPlayerId(""));
      assert.ok(!isValidPlayerId("ab")); // too short
      assert.ok(!isValidPlayerId("a".repeat(100))); // too long
      assert.ok(!isValidPlayerId("player@123")); // invalid chars
      assert.ok(!isValidPlayerId(null));
      assert.ok(!isValidPlayerId(undefined));
    });
  });

  describe("isValidDisplayName", () => {
    it("should accept valid display names", () => {
      assert.ok(isValidDisplayName("Alice"));
      assert.ok(isValidDisplayName("Bob123"));
      assert.ok(isValidDisplayName("Test User"));
    });

    it("should reject invalid display names", () => {
      assert.ok(!isValidDisplayName(""));
      assert.ok(!isValidDisplayName("   "));
      assert.ok(!isValidDisplayName("a".repeat(100)));
      assert.ok(!isValidDisplayName(null));
    });
  });

  describe("isValidJoinCode", () => {
    // Join codes are 4 characters from a confusable-free alphabet; see src/util/codes.js.
    it("should accept valid join codes", () => {
      assert.ok(isValidJoinCode("ABC2"));
      assert.ok(isValidJoinCode("XYZW"));
    });

    it("should reject invalid join codes", () => {
      assert.ok(!isValidJoinCode("abc2")); // lowercase
      assert.ok(!isValidJoinCode("ABC")); // too short
      assert.ok(!isValidJoinCode("ABC23")); // too long
      assert.ok(!isValidJoinCode("AB-2")); // invalid char
      assert.ok(!isValidJoinCode("IO01")); // confusable chars are not in the alphabet
    });
  });

  describe("isValidActionType", () => {
    it("should accept valid action types", () => {
      assert.ok(isValidActionType("PLACE_SETTLEMENT"));
      assert.ok(isValidActionType("ROLL_DICE"));
      assert.ok(isValidActionType("PLAY_CARD"));
    });

    it("should reject invalid action types", () => {
      assert.ok(!isValidActionType("place_settlement")); // lowercase
      assert.ok(!isValidActionType("AB")); // too short
      assert.ok(!isValidActionType("A".repeat(100))); // too long
      assert.ok(!isValidActionType("PLAY-CARD")); // invalid char
    });
  });

  describe("isValidGameKey", () => {
    it("should accept valid game keys", () => {
      assert.ok(isValidGameKey("catan"));
      assert.ok(isValidGameKey("uno"));
      assert.ok(isValidGameKey("chess"));
    });

    it("should reject invalid game keys", () => {
      assert.ok(!isValidGameKey("monopoly"));
      assert.ok(!isValidGameKey(""));
      assert.ok(!isValidGameKey(null));
    });
  });

  describe("isValidGameMode", () => {
    it("should accept valid game modes", () => {
      assert.ok(isValidGameMode("catan", "3P"));
      assert.ok(isValidGameMode("catan", "4P"));
      assert.ok(isValidGameMode("chess", "PVP"));
      assert.ok(isValidGameMode("chess", "AI"));
    });

    it("should reject invalid game modes", () => {
      assert.ok(!isValidGameMode("catan", "2P"));
      assert.ok(!isValidGameMode("chess", "PARTY"));
      assert.ok(!isValidGameMode("unknown", "PVP"));
    });
  });

  describe("isValidChatMessage", () => {
    it("should accept valid messages", () => {
      assert.ok(isValidChatMessage("Hello!"));
      assert.ok(isValidChatMessage("This is a test message"));
    });

    it("should reject invalid messages", () => {
      assert.ok(!isValidChatMessage(""));
      assert.ok(!isValidChatMessage("   "));
      assert.ok(!isValidChatMessage("a".repeat(501)));
      assert.ok(!isValidChatMessage(null));
    });
  });

  describe("isValidInteger", () => {
    it("should accept valid integers in range", () => {
      assert.ok(isValidInteger(5, 0, 10));
      assert.ok(isValidInteger(0, 0, 10));
      assert.ok(isValidInteger(-5, -10, 10));
    });

    it("should reject invalid integers", () => {
      assert.ok(!isValidInteger(11, 0, 10));
      assert.ok(!isValidInteger(-1, 0, 10));
      assert.ok(!isValidInteger(3.14, 0, 10));
      assert.ok(!isValidInteger("5", 0, 10));
    });
  });
});
