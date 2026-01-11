import test from "node:test";
import assert from "node:assert/strict";
import {
  canPlayCard,
  createDeck,
  createShuffledDeck,
  deal,
  getLegalPlays,
  parseCard,
  shuffle,
} from "../src/games/cards/cardUtils.js";

test("cardUtils: createDeck builds a standard 52-card deck", () => {
  const deck = createDeck();
  const unique = new Set(deck);
  assert.equal(deck.length, 52);
  assert.equal(unique.size, 52);
});

test("cardUtils: parseCard parses rank, suit, index, points", () => {
  const card = parseCard("10H");
  assert.equal(card.rank, "10");
  assert.equal(card.suit, "H");
  assert.equal(card.index, 10);
  assert.equal(card.points, 10);
});

test("cardUtils: shuffle is deterministic with seed", () => {
  const base = [1, 2, 3, 4, 5];
  const first = shuffle([...base], 42);
  const second = shuffle([...base], 42);
  assert.deepEqual(first, second);
});

test("cardUtils: createShuffledDeck returns 52 cards and is seeded", () => {
  const deck1 = createShuffledDeck(7);
  const deck2 = createShuffledDeck(7);
  assert.equal(deck1.length, 52);
  assert.deepEqual(deck1, deck2);
});

test("cardUtils: deal throws if count exceeds deck size", () => {
  const deck = ["AH", "2H"];
  assert.throws(() => deal(deck, 3), /Cannot deal 3 cards/);
});

test("cardUtils: legal plays obey 31 limit", () => {
  const hand = ["KH", "5C"];
  assert.equal(canPlayCard("KH", 27), false);
  assert.equal(canPlayCard("5C", 26), true);
  assert.deepEqual(getLegalPlays(hand, 26), ["5C"]);
});
