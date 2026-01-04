import { createReversiInitialState } from "./reversi/reversiService.js";

export function createInitialState(gameKey, mode) {
  if (gameKey === "reversi") {
    return createReversiInitialState(mode);
  }

  throw new Error("UNKNOWN_GAME");
}
