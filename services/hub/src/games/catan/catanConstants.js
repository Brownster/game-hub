// Catan game constants

// Resources
export const RESOURCES = {
  WOOD: "wood",
  BRICK: "brick",
  SHEEP: "sheep",
  WHEAT: "wheat",
  ORE: "ore",
};

export const RESOURCE_LIST = Object.values(RESOURCES);

// Tile types (terrain)
export const TERRAIN = {
  FOREST: "forest",   // produces wood
  HILLS: "hills",     // produces brick
  PASTURE: "pasture", // produces sheep
  FIELDS: "fields",   // produces wheat
  MOUNTAINS: "mountains", // produces ore
  DESERT: "desert",   // produces nothing
};

// Map terrain to resource
export const TERRAIN_RESOURCE = {
  [TERRAIN.FOREST]: RESOURCES.WOOD,
  [TERRAIN.HILLS]: RESOURCES.BRICK,
  [TERRAIN.PASTURE]: RESOURCES.SHEEP,
  [TERRAIN.FIELDS]: RESOURCES.WHEAT,
  [TERRAIN.MOUNTAINS]: RESOURCES.ORE,
  [TERRAIN.DESERT]: null,
};

// Building costs
export const BUILDING_COSTS = {
  road: { [RESOURCES.WOOD]: 1, [RESOURCES.BRICK]: 1 },
  settlement: { [RESOURCES.WOOD]: 1, [RESOURCES.BRICK]: 1, [RESOURCES.SHEEP]: 1, [RESOURCES.WHEAT]: 1 },
  city: { [RESOURCES.WHEAT]: 2, [RESOURCES.ORE]: 3 },
  devCard: { [RESOURCES.SHEEP]: 1, [RESOURCES.WHEAT]: 1, [RESOURCES.ORE]: 1 },
};

// Building types
export const BUILDINGS = {
  SETTLEMENT: "settlement",
  CITY: "city",
};

// Development card types
export const DEV_CARDS = {
  KNIGHT: "knight",
  ROAD_BUILDING: "roadBuilding",
  YEAR_OF_PLENTY: "yearOfPlenty",
  MONOPOLY: "monopoly",
  VICTORY_POINT: "victoryPoint",
};

// Development card deck composition (base game)
export const DEV_CARD_COUNTS = {
  [DEV_CARDS.KNIGHT]: 14,
  [DEV_CARDS.ROAD_BUILDING]: 2,
  [DEV_CARDS.YEAR_OF_PLENTY]: 2,
  [DEV_CARDS.MONOPOLY]: 2,
  [DEV_CARDS.VICTORY_POINT]: 5,
};

// Port types
export const PORTS = {
  GENERIC: "generic",  // 3:1 any resource
  WOOD: "wood",        // 2:1 wood
  BRICK: "brick",
  SHEEP: "sheep",
  WHEAT: "wheat",
  ORE: "ore",
};

// Port ratios
export const PORT_RATIOS = {
  [PORTS.GENERIC]: 3,
  [PORTS.WOOD]: 2,
  [PORTS.BRICK]: 2,
  [PORTS.SHEEP]: 2,
  [PORTS.WHEAT]: 2,
  [PORTS.ORE]: 2,
};

// Default bank trade ratio (no port)
export const DEFAULT_TRADE_RATIO = 4;

// Standard board configuration for base game
// Tiles go: center, then ring 1, then ring 2
export const STANDARD_TERRAIN = [
  // Center
  TERRAIN.DESERT,
  // Ring 1 (6 tiles)
  TERRAIN.FIELDS, TERRAIN.PASTURE, TERRAIN.FOREST,
  TERRAIN.HILLS, TERRAIN.MOUNTAINS, TERRAIN.FIELDS,
  // Ring 2 (12 tiles)
  TERRAIN.FOREST, TERRAIN.PASTURE, TERRAIN.HILLS,
  TERRAIN.FIELDS, TERRAIN.MOUNTAINS, TERRAIN.FOREST,
  TERRAIN.PASTURE, TERRAIN.HILLS, TERRAIN.PASTURE,
  TERRAIN.MOUNTAINS, TERRAIN.FIELDS, TERRAIN.FOREST,
];

// Standard number tokens (2-12, excluding 7)
// Ordered for balanced distribution on standard board
export const STANDARD_NUMBERS = [
  // Ring 1 (clockwise from top)
  5, 2, 6, 3, 8, 10,
  // Ring 2 (clockwise from top)
  9, 12, 11, 4, 8, 10, 9, 4, 5, 6, 3, 11,
];

// Standard port configuration
// Each port has: position (edge between two hexes), type
export const STANDARD_PORTS = [
  { type: PORTS.GENERIC },
  { type: PORTS.WHEAT },
  { type: PORTS.ORE },
  { type: PORTS.GENERIC },
  { type: PORTS.SHEEP },
  { type: PORTS.GENERIC },
  { type: PORTS.GENERIC },
  { type: PORTS.BRICK },
  { type: PORTS.WOOD },
];

// Game phases
export const PHASES = {
  LOBBY: "LOBBY",
  SETUP_SETTLEMENT_1: "SETUP_SETTLEMENT_1",
  SETUP_ROAD_1: "SETUP_ROAD_1",
  SETUP_SETTLEMENT_2: "SETUP_SETTLEMENT_2",
  SETUP_ROAD_2: "SETUP_ROAD_2",
  ROLL: "ROLL",
  DISCARD: "DISCARD",
  ROBBER_MOVE: "ROBBER_MOVE",
  ROBBER_STEAL: "ROBBER_STEAL",
  MAIN: "MAIN",
  FINISHED: "FINISHED",
};

// Player colors
export const PLAYER_COLORS = ["red", "blue", "orange", "white"];

// Starting pieces per player
export const STARTING_PIECES = {
  settlements: 5,
  cities: 4,
  roads: 15,
};

// Victory points
export const VP_VALUES = {
  settlement: 1,
  city: 2,
  longestRoad: 2,
  largestArmy: 2,
  devCardVP: 1,
};

// Minimum road length for Longest Road
export const MIN_LONGEST_ROAD = 5;

// Minimum knights for Largest Army
export const MIN_LARGEST_ARMY = 3;

// Default victory point target
export const DEFAULT_TARGET_VP = 10;

// Max hand size before discard on 7
export const MAX_HAND_SIZE_ON_SEVEN = 7;

// Action types
export const ACTIONS = {
  PLACE_SETTLEMENT: "PLACE_SETTLEMENT",
  PLACE_ROAD: "PLACE_ROAD",
  ROLL_DICE: "ROLL_DICE",
  BUILD_ROAD: "BUILD_ROAD",
  BUILD_SETTLEMENT: "BUILD_SETTLEMENT",
  BUILD_CITY: "BUILD_CITY",
  BUY_DEV_CARD: "BUY_DEV_CARD",
  PLAY_DEV_CARD: "PLAY_DEV_CARD",
  MOVE_ROBBER: "MOVE_ROBBER",
  STEAL_RESOURCE: "STEAL_RESOURCE",
  DISCARD_RESOURCES: "DISCARD_RESOURCES",
  PROPOSE_TRADE: "PROPOSE_TRADE",
  ACCEPT_TRADE: "ACCEPT_TRADE",
  REJECT_TRADE: "REJECT_TRADE",
  CANCEL_TRADE: "CANCEL_TRADE",
  BANK_TRADE: "BANK_TRADE",
  END_TURN: "END_TURN",
  SELECT_RESOURCES: "SELECT_RESOURCES",      // Year of Plenty
  SELECT_RESOURCE_TYPE: "SELECT_RESOURCE_TYPE", // Monopoly
};
