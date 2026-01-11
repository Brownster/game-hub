import React, { useMemo, useState } from "react";
import { Chess } from "chess.js";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];
const PIECE_NAMES = { p: "pawn", r: "rook", n: "knight", b: "bishop", q: "queen", k: "king" };

function getSquare(col, row, orientation) {
  const fileIndex = orientation === "b" ? 7 - col : col;
  const rankIndex = orientation === "b" ? 7 - row : row;
  return `${FILES[fileIndex]}${RANKS[rankIndex]}`;
}

function getPieceImage(piece) {
  if (!piece) return "";
  const name = PIECE_NAMES[piece.type];
  const color = piece.color === "w" ? "w" : "b";
  return `/chess/pieces/256h/${color}_${name}_png_256px.png`;
}

function buildMoveRows(moves) {
  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      turn: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1] || "",
    });
  }
  return rows;
}

export default function ChessBoard({ state, playerId, onAction }) {
  const [selected, setSelected] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [pendingPromotion, setPendingPromotion] = useState(null);

  const chess = useMemo(() => {
    if (!state?.fen) return null;
    return new Chess(state.fen);
  }, [state?.fen]);

  const myColor = state?.myColor || "w";
  const isMyTurn = state?.phase === "TURN" && state?.turn === myColor;
  const board = chess ? chess.board() : [];
  const moveRows = buildMoveRows(state?.moves || []);

  const drawOfferBy = state?.drawOfferBy;
  const opponentOffer = drawOfferBy && drawOfferBy !== playerId;
  const myOffer = drawOfferBy && drawOfferBy === playerId;

  const handleSelect = (col, row) => {
    if (!chess || !isMyTurn) return;
    const square = getSquare(col, row, myColor);
    const piece = chess.get(square);
    if (!piece || piece.color !== myColor) {
      setSelected(null);
      setLegalTargets([]);
      return;
    }

    const moves = chess.moves({ square, verbose: true });
    setSelected(square);
    setLegalTargets(moves.map((m) => m.to));
  };

  const handleMove = (col, row) => {
    if (!chess || !selected || !isMyTurn) return;
    const to = getSquare(col, row, myColor);
    if (!legalTargets.includes(to)) return;

    const options = chess.moves({ square: selected, verbose: true }).filter((m) => m.to === to);
    const requiresPromotion = options.some((m) => m.flags.includes("p"));
    if (requiresPromotion) {
      setPendingPromotion({ from: selected, to });
      return;
    }

    onAction({ type: "MOVE", from: selected, to });
    setSelected(null);
    setLegalTargets([]);
  };

  const handlePromotion = (piece) => {
    if (!pendingPromotion) return;
    onAction({ type: "MOVE", from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece });
    setPendingPromotion(null);
    setSelected(null);
    setLegalTargets([]);
  };

  if (!state || !state.board) {
    return <div className="chess">Waiting for game...</div>;
  }

  return (
    <div className="chess">
      <header className="chess__header">
        <div>
          <div className="chess__title">Chess</div>
          <div className="chess__subtitle">
            {isMyTurn ? "Your move" : "Waiting for opponent"}
          </div>
        </div>
        <div className="chess__controls">
          <button className="chess__btn" onClick={() => onAction({ type: "OFFER_DRAW" })} disabled={myOffer}>
            {myOffer ? "Draw offered" : "Offer draw"}
          </button>
          <button className="chess__btn danger" onClick={() => onAction({ type: "RESIGN" })}>
            Resign
          </button>
        </div>
      </header>

      <div className="chess__layout">
        <div className="chess__board">
          {Array.from({ length: 8 }).map((_, row) => (
            <div className="chess__row" key={`row-${row}`}>
              {Array.from({ length: 8 }).map((_, col) => {
                const boardRow = myColor === "b" ? 7 - row : row;
                const boardCol = myColor === "b" ? 7 - col : col;
                const piece = board[boardRow]?.[boardCol] || null;
                const square = getSquare(col, row, myColor);
                const isSelected = selected === square;
                const isLegal = legalTargets.includes(square);
                const isDark = (row + col) % 2 === 1;

                return (
                  <button
                    key={`${row}-${col}`}
                    className={`chess__tile ${isDark ? "dark" : "light"} ${isSelected ? "selected" : ""} ${isLegal ? "legal" : ""}`}
                    onClick={() => {
                      if (!isMyTurn || !chess) return;
                      if (isSelected) {
                        setSelected(null);
                        setLegalTargets([]);
                        return;
                      }
                      if (selected) {
                        if (piece && piece.color === myColor) {
                          const nextSquare = getSquare(col, row, myColor);
                          const moves = chess.moves({ square: nextSquare, verbose: true });
                          setSelected(nextSquare);
                          setLegalTargets(moves.map((m) => m.to));
                          return;
                        }
                        handleMove(col, row);
                      } else {
                        handleSelect(col, row);
                      }
                    }}
                  >
                    {piece && (
                      <img
                        src={getPieceImage(piece)}
                        alt={`${piece.color}${piece.type}`}
                        className="chess__piece"
                        draggable={false}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <aside className="chess__sidebar">
          <div className="chess__panel">
            <div className="chess__panel-title">Moves</div>
            <div className="chess__moves">
              {moveRows.length === 0 && <div className="chess__empty">No moves yet</div>}
              {moveRows.map((row) => (
                <div key={`turn-${row.turn}`} className="chess__move-row">
                  <span className="turn">{row.turn}.</span>
                  <span className="move">{row.white}</span>
                  <span className="move">{row.black}</span>
                </div>
              ))}
            </div>
          </div>

          {opponentOffer && (
            <div className="chess__panel">
              <div className="chess__panel-title">Draw offer</div>
              <div className="chess__draw-actions">
                <button className="chess__btn" onClick={() => onAction({ type: "ACCEPT_DRAW" })}>
                  Accept
                </button>
                <button className="chess__btn secondary" onClick={() => onAction({ type: "DECLINE_DRAW" })}>
                  Decline
                </button>
              </div>
            </div>
          )}
        </aside>
      </div>

      {pendingPromotion && (
        <div className="chess__modal-overlay" onClick={() => setPendingPromotion(null)}>
          <div className="chess__modal" onClick={(e) => e.stopPropagation()}>
            <div className="chess__panel-title">Choose promotion</div>
            <div className="chess__promotion">
              {["q", "r", "b", "n"].map((piece) => (
                <button
                  key={piece}
                  className="chess__promo-btn"
                  onClick={() => handlePromotion(piece)}
                >
                  <img
                    src={getPieceImage({ type: piece, color: myColor })}
                    alt={piece}
                    className="chess__piece"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {state.phase === "FINISHED" && (
        <div className="chess__modal-overlay">
          <div className="chess__modal">
            <div className="chess__title">Game Over</div>
            <div className="chess__subtitle">
              {state.drawReason
                ? `Draw: ${state.drawReason}`
                : state.winnerColor === myColor
                  ? "You win!"
                  : "You lose."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
