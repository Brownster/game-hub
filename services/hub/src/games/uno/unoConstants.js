// UNO game constants

export const COLORS = ["red", "yellow", "green", "blue"];
export const WILD_COLOR = "wild";

export const CARD_TYPES = {
  NUMBER: "number",
  SKIP: "skip",
  REVERSE: "reverse",
  DRAW2: "draw2",
  WILD: "wild",
  DRAW4: "draw4",
};

export const PHASES = {
  LOBBY: "LOBBY",
  TURN: "TURN",
  COLOR_CHOICE: "COLOR_CHOICE",
  FINISHED: "FINISHED",
};

export const ACTIONS = {
  PLAY_CARD: "PLAY_CARD",
  DRAW_CARD: "DRAW_CARD",
  PASS: "PASS",
  CHOOSE_COLOR: "CHOOSE_COLOR",
  CALL_UNO: "CALL_UNO",
  SET_RULES: "SET_RULES",
};

export const DEFAULT_HAND_SIZE = 7;
export const MAX_PLAYERS = 8;

export const DEFAULT_RULES = {
  drawThenPlay: true,
  stacking: false,
  unoCall: true,
  challengeDraw4: false,
};
