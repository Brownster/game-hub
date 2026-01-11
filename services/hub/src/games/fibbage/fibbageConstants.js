// Fibbage game phases
export const PHASES = {
  LOBBY: "LOBBY",
  PROMPT: "PROMPT",           // Show question to all players
  SUBMIT_LIES: "SUBMIT_LIES", // Players submit fake answers
  VOTE: "VOTE",               // Players vote on answers
  REVEAL: "REVEAL",           // Show who wrote what and who voted for what
  SCORE: "SCORE",             // Show round scores
  GAME_END: "GAME_END",       // Final results
};

// Action types
export const ACTIONS = {
  SUBMIT_LIE: "SUBMIT_LIE",
  SUBMIT_VOTE: "SUBMIT_VOTE",
  NEXT_ROUND: "NEXT_ROUND",
  CONTINUE: "CONTINUE",
};

// Scoring values
export const SCORING = {
  CORRECT_ANSWER: 10,    // Points for picking the truth
  FOOLED_PLAYER: 5,      // Points per player fooled by your lie
  NO_ONE_CORRECT: 5,     // Bonus if no one picks the truth (optional)
};

// Game settings
export const SETTINGS = {
  MIN_PLAYERS: 3,
  MAX_PLAYERS: 8,
  ROUNDS_DEFAULT: 8,
  SUBMIT_TIME_MS: 60_000,  // 60 seconds to submit lie
  VOTE_TIME_MS: 30_000,    // 30 seconds to vote
  REVEAL_TIME_MS: 8_000,   // 8 seconds for reveal
  SCORE_TIME_MS: 5_000,    // 5 seconds to show scores
};

// Truth marker for choices
export const TRUTH_MARKER = "__TRUTH__";
