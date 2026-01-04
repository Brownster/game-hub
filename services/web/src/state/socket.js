import { io } from "socket.io-client";
import { ensureSession } from "./session.js";

let socket = null;

export function getSocket() {
  if (socket) return socket;

  socket = io({
    transports: ["websocket"],
    autoConnect: true
  });

  socket.on("connect", () => {
    const session = ensureSession();
    socket.emit("session:hello", session);
  });

  return socket;
}
