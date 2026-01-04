import {
  addPlayer,
  getMapSize,
  initSlitherEngine,
  removePlayer,
  respawnPlayer,
  tickAndGetState,
  updateAngle
} from "./slitherEngine.js";

const TICK_RATE = 1000 / 30;
let intervalId = null;

export function registerSlitherNamespace(io) {
  const nsp = io.of("/slither");

  if (!intervalId) {
    initSlitherEngine();
    intervalId = setInterval(() => {
      const state = tickAndGetState();
      nsp.emit("gameState", state);
    }, TICK_RATE);
  }

  nsp.on("connection", (socket) => {
    socket.on("join", (name) => {
      const player = addPlayer(socket.id, name);
      socket.emit("init", { id: player.id, mapSize: getMapSize() });
    });

    socket.on("updateAngle", (angle) => {
      updateAngle(socket.id, angle);
    });

    socket.on("respawn", (name) => {
      respawnPlayer(socket.id, name);
    });

    socket.on("disconnect", () => {
      removePlayer(socket.id);
    });
  });
}
