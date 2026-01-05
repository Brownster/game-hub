import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import HubHome from "./pages/HubHome.jsx";
import ReversiHome from "./pages/ReversiHome.jsx";
import Lobby from "./pages/Lobby.jsx";
import Game from "./pages/Game.jsx";
import Slither from "./pages/Slither.jsx";
import WordleHome from "./pages/WordleHome.jsx";
import WordleGame from "./pages/WordleGame.jsx";
import DrawHome from "./pages/DrawHome.jsx";
import DrawGame from "./pages/DrawGame.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HubHome />} />
      <Route path="/reversi" element={<ReversiHome />} />
      <Route path="/lobby/:code" element={<Lobby />} />
      <Route path="/game/:code" element={<Game />} />
      <Route path="/slither" element={<Slither />} />
      <Route path="/wordle" element={<WordleHome />} />
      <Route path="/wordle/daily" element={<WordleGame mode="daily" />} />
      <Route path="/wordle/free" element={<WordleGame mode="free" />} />
      <Route path="/wordle/vs/:code" element={<WordleGame mode="vs" />} />
      <Route path="/draw" element={<DrawHome />} />
      <Route path="/draw/:code" element={<DrawGame />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
