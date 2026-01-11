import { createReversiInitialState } from "./reversi/reversiService.js";
import { createDrawInitialState } from "./draw/drawService.js";
import { createConnect4InitialState } from "./connect4/connect4Service.js";
import { createCharadesInitialState } from "./charades/charadesService.js";
import { createCribbageInitialState } from "./cribbage/cribbageService.js";
import { createCatanInitialState } from "./catan/catanService.js";
import { createUnoInitialState } from "./uno/unoService.js";
import { createFibbageInitialState } from "./fibbage/fibbageService.js";
import { createCrazyEightsInitialState } from "./crazy_eights/crazyEightsService.js";
import { createChessInitialState } from "./chess/chessService.js";
import { createWordleInitialState } from "./wordle/wordleRoomService.js";

export function createInitialState(gameKey, mode, players = []) {
  if (gameKey === "reversi") {
    return createReversiInitialState(mode);
  }
  if (gameKey === "draw") {
    return createDrawInitialState();
  }
  if (gameKey === "connect4") {
    return createConnect4InitialState(mode);
  }
  if (gameKey === "charades") {
    return createCharadesInitialState();
  }
  if (gameKey === "cribbage") {
    return createCribbageInitialState(mode);
  }
  if (gameKey === "catan") {
    return createCatanInitialState(players, mode);
  }
  if (gameKey === "uno") {
    return createUnoInitialState(players, mode);
  }
  if (gameKey === "fibbage") {
    return createFibbageInitialState();
  }
  if (gameKey === "crazy_eights") {
    return createCrazyEightsInitialState(players);
  }
  if (gameKey === "chess") {
    return createChessInitialState(players, mode);
  }
  if (gameKey === "wordle") {
    return createWordleInitialState(players, mode);
  }

  throw new Error("UNKNOWN_GAME");
}
