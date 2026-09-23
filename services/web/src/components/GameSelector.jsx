import React, { useState } from "react";

const GAMES = [
  {
    key: "reversi",
    accent: "#34d399",
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
    accent: "#60a5fa",
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
    accent: "#f472b6",
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
    accent: "#c084fc",
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
    accent: "#fbbf24",
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
    accent: "#fb923c",
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
    accent: "#f87171",
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
    accent: "#22d3ee",
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
    accent: "#e2e8f0",
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
    accent: "#a3e635",
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
    accent: "#facc15",
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


// Small geometric marks, drawn in currentColor so each card tints its own.
// A nine-year-old should be able to find their game without reading a word.
const ICONS = {
  reversi: <><circle cx="8" cy="12" r="5" fill="currentColor" /><ellipse cx="17.5" cy="12" rx="2.1" ry="5" fill="none" stroke="currentColor" strokeWidth="1.8" /></>,
  connect4: <><rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="7.6" cy="16.4" r="1.75" fill="currentColor" /><circle cx="10.5" cy="13.5" r="1.75" fill="currentColor" /><circle cx="13.5" cy="10.5" r="1.75" fill="currentColor" /><circle cx="16.4" cy="7.6" r="1.75" fill="currentColor" /></>,
  draw: <path d="M4 20l1-4.2L15.6 5.2a2 2 0 012.8 0l1.4 1.4a2 2 0 010 2.8L9.2 19 4 20z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  charades: <><path d="M4 7h16v5a8 8 0 01-16 0V7z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="9" cy="11" r="1.2" fill="currentColor" /><circle cx="15" cy="11" r="1.2" fill="currentColor" /><path d="M9.5 15.5a4 4 0 005 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  cribbage: <><rect x="3.5" y="5" width="11" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="18" cy="8" r="1.4" fill="currentColor" /><circle cx="18" cy="12" r="1.4" fill="currentColor" /><circle cx="18" cy="16" r="1.4" fill="currentColor" /></>,
  catan: <path d="M12 3l7 4.5v9L12 21l-7-4.5v-9L12 3z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  uno: <><rect x="5" y="3" width="14" height="18" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M9 17L15 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></>,
  crazy_eights: <><circle cx="12" cy="8" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="16" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" /></>,
  chess: <path d="M6 20h12l-1-4H7l-1 4zM8 16l-1-6 3 1.5L12 7l2 4.5L17 10l-1 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  fibbage: <path d="M4 5h16v10H9l-5 4V5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />,
  wordle: <><rect x="2.5" y="8" width="6" height="8" rx="1.2" fill="currentColor" /><rect x="9.5" y="8" width="6" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" /><rect x="16.5" y="8" width="5" height="8" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" /></>,
};

function GameIcon({ gameKey }) {
  return (
    <svg className="game-card__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {ICONS[gameKey] || <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />}
    </svg>
  );
}

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
              style={{ "--game-accent": game.accent }}
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
              <GameIcon gameKey={game.key} />
              <div className="game-card-name">{game.name}</div>
              <div className="game-card-desc">{game.description}</div>
              <div className="game-card-players">
                {canPlay ? (
                  game.minPlayers === game.maxPlayers
                    ? `${game.minPlayers} players`
                    : `${game.minPlayers}-${game.maxPlayers} players`
                ) : (
                  <span className="game-card-warning">Needs {game.minPlayers} players</span>
                )}
              </div>
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
