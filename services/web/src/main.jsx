import "@fontsource/archivo-black";
import "@fontsource/dm-serif-display";
import "@fontsource/indie-flower";
import "@fontsource/orbitron";
import "@fontsource/rajdhani";
import "@fontsource/vt323";
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/main.css";

const root = createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
