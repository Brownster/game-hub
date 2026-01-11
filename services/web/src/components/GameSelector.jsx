import React, { useState } from "react";

const GAMES = [
  {
    key: "reversi",
    name: "Reversi",
    description: "Classic strategy game. Flip your opponent's pieces!",
    minPlayers: 2,
    maxPlayers: 2,
    modes: [
      { value: "PVP", label: "Player vs Player" },
      { value: "AI", label: "vs Computer" },
    ],
    rules: [
      "Players alternate placing discs.",
      "You must flip at least one opponent disc each move.",
      "Any discs bracketed in a line flip to your color.",
      "Game ends when no moves remain; most discs wins.",
    ],
  },
  {
    key: "connect4",
    name: "Connect 4",
    description: "Drop pieces to connect four in a row!",
    minPlayers: 2,
    maxPlayers: 2,
    modes: [
      { value: "PVP", label: "Player vs Player" },
      { value: "AI", label: "vs Computer" },
    ],
    rules: [
      "Players drop a piece into a column each turn.",
      "First to connect four in a row wins.",
      "Lines can be vertical, horizontal, or diagonal.",
    ],
  },
  {
    key: "draw",
    name: "Draw & Guess",
    description: "Draw and guess words in turns!",
    minPlayers: 2,
    maxPlayers: 12,
    modes: [{ value: "PARTY", label: "Party Mode" }],
    rules: [
      "One player draws; others guess the word.",
      "Correct guess ends the round and awards points.",
      "Drawer also earns a smaller bonus.",
    ],
  },
  {
    key: "charades",
    name: "Charades",
    description: "Act out prompts for others to guess!",
    minPlayers: 2,
    maxPlayers: 12,
    modes: [{ value: "PARTY", label: "Party Mode" }],
    rules: [
      "One player performs a prompt silently.",
      "Others guess before time runs out.",
      "Correct guess ends the round.",
    ],
  },
  {
    key: "cribbage",
    name: "Cribbage",
    description: "Classic card game. First to 121 points wins!",
    minPlayers: 2,
    maxPlayers: 2,
    modes: [{ value: "2P", label: "2 Player" }],
    rules: [
      "Each player discards to the dealer’s crib.",
      "Pegging scores runs, pairs, fifteens, and 31.",
      "Hands and crib are scored after pegging.",
      "First to 121 points wins.",
    ],
  },
  {
    key: "catan",
    name: "Catan",
    description: "Build settlements, trade resources, conquer the island!",
    minPlayers: 3,
    maxPlayers: 4,
    modes: [
      { value: "4P", label: "4 Players" },
      { value: "3P", label: "3 Players" },
    ],
    rules: [
      "Roll dice to collect resources from tiles.",
      "Build roads, settlements, and cities.",
      "Trade with players or the bank.",
      "First to 10 victory points wins.",
    ],
  },
  {
    key: "uno",
    name: "UNO",
    description: "Match colors or numbers, play wilds, be the first to finish!",
    minPlayers: 2,
    maxPlayers: 8,
    modes: [{ value: "STANDARD", label: "Standard" }],
    rules: [
      "Match color, number, or symbol.",
      "Wilds change color; draw cards when required.",
      "Call UNO when you reach one card.",
      "First to zero cards wins.",
    ],
  },
  {
    key: "crazy_eights",
    name: "Crazy Eights",
    description: "Match suits or ranks, play 8s as wilds, and empty your hand!",
    minPlayers: 2,
    maxPlayers: 6,
    modes: [{ value: "STANDARD", label: "Standard" }],
    rules: [
      "Match suit or rank of the discard.",
      "Eights are wild; declare the next suit.",
      "Draw when you have no playable card.",
      "First to empty your hand wins.",
    ],
  },
  {
    key: "chess",
    name: "Chess",
    description: "Classic chess. Checkmate the opponent to win.",
    minPlayers: 2,
    maxPlayers: 2,
    modes: [
      { value: "PVP", label: "Player vs Player" },
      { value: "AI", label: "vs Computer (WIP)" },
    ],
    rules: [
      "White moves first; players alternate turns.",
      "Checkmate ends the game immediately.",
      "Stalemate or repetition is a draw.",
      "You can offer or accept a draw at any time.",
    ],
  },
  {
    key: "fibbage",
    name: "Fibbage",
    description: "Write fake answers to fool others. Spot the truth!",
    minPlayers: 3,
    maxPlayers: 8,
    modes: [{ value: "PARTY", label: "Party Mode" }],
    rules: [
      "Write a believable lie for the prompt.",
      "Vote for the truth among the choices.",
      "Score for guessing right and fooling others.",
    ],
  },
  {
    key: "wordle",
    name: "Wordle",
    description: "Guess the 5-letter word! Race against others.",
    minPlayers: 2,
    maxPlayers: 8,
    modes: [
      { value: "STANDARD", label: "Standard (3 rounds)" },
      { value: "QUICK", label: "Quick (1 round)" },
      { value: "LONG", label: "Long (5 rounds)" },
    ],
    rules: [
      "Everyone guesses the same secret word.",
      "Green = correct letter and position.",
      "Yellow = correct letter, wrong position.",
      "Gray = letter not in the word.",
      "First to solve wins the round!",
    ],
  },
];

export default function GameSelector({ onSelect, playerCount, isHost }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [rulesGame, setRulesGame] = useState(null);

  const isModeAvailable = (game, modeValue) => {
    if (game.key === "catan") {
      if (modeValue === "4P") return playerCount >= 4;
      if (modeValue === "3P") return playerCount >= 3;
    }
    if (game.key === "chess" && modeValue === "AI") {
      return playerCount >= 1;
    }
    return playerCount >= game.minPlayers;
  };

  const handleSelectGame = (game) => {
    setSelectedGame(game);
    const firstAvailableMode = game.modes.find((mode) =>
      isModeAvailable(game, mode.value)
    );
    setSelectedMode(firstAvailableMode?.value || null);
  };

  const handleConfirm = () => {
    if (!selectedGame || !selectedMode) return;
    onSelect(selectedGame.key, selectedMode);
  };

  if (!isHost) {
    return (
      <div className="game-selector">
        <div className="game-selector-waiting">
          <h2>Waiting for Host</h2>
          <p>The host will select a game to play.</p>
          <p className="player-count">{playerCount} player{playerCount !== 1 ? "s" : ""} in room</p>
        </div>
      </div>
    );
  }

  return (
    <div className="game-selector">
      <h2 className="game-selector-title">Choose a Game</h2>
      <p className="game-selector-subtitle">{playerCount} player{playerCount !== 1 ? "s" : ""} in room</p>

      <div className="game-grid">
        {GAMES.map((game) => {
          const canPlay = game.key === "chess" ? playerCount >= 1 : playerCount >= game.minPlayers;
          const isSelected = selectedGame?.key === game.key;

          return (
            <div
              key={game.key}
              className={`game-card ${isSelected ? "selected" : ""} ${!canPlay ? "disabled" : ""}`}
              onClick={() => canPlay && handleSelectGame(game)}
              role="button"
              tabIndex={canPlay ? 0 : -1}
              aria-disabled={!canPlay}
              onKeyDown={(e) => {
                if (!canPlay) return;
                if (e.key === "Enter" || e.key === " ") {
                  handleSelectGame(game);
                }
              }}
            >
              <div className="game-card-name">{game.name}</div>
              <div className="game-card-desc">{game.description}</div>
              <div className="game-card-players">
                {game.minPlayers === game.maxPlayers
                  ? `${game.minPlayers} players`
                  : `${game.minPlayers}-${game.maxPlayers} players`}
              </div>
              {!canPlay && (
                <div className="game-card-warning">Need {game.minPlayers} players</div>
              )}
              <div className="game-card-actions">
                <button
                  className="game-card-rules"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRulesGame(game);
                  }}
                >
                  Rules
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {selectedGame && (
        <div className="game-mode-select">
          <div className="mode-label">Game Mode:</div>
          <div className="mode-options">
            {selectedGame.modes.map((mode) => (
              <button
                key={mode.value}
                className={`mode-btn ${selectedMode === mode.value ? "active" : ""}`}
                onClick={() => isModeAvailable(selectedGame, mode.value) && setSelectedMode(mode.value)}
                disabled={!isModeAvailable(selectedGame, mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <button
            className="room-btn primary confirm-btn"
            onClick={handleConfirm}
            disabled={!selectedMode}
          >
            Select {selectedGame.name}
          </button>
        </div>
      )}

      {rulesGame && (
        <div className="rules-modal-overlay" onClick={() => setRulesGame(null)}>
          <div className="rules-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{rulesGame.name} Rules</h3>
              <button className="close-btn" onClick={() => setRulesGame(null)}>
                ×
              </button>
            </div>
            <ul className="rules-list">
              {rulesGame.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
