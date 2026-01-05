import { createReversiInitialState } from "./reversi/reversiService.js";
import { createDrawInitialState } from "./draw/drawService.js";

export function createInitialState(gameKey, mode) {
  if (gameKey === "reversi") {
    return createReversiInitialState(mode);
  }
  if (gameKey === "draw") {
    return createDrawInitialState();
  }

  throw new Error("UNKNOWN_GAME");
}
