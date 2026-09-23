import { io } from "socket.io-client";
import { ensureSession } from "./session.js";

let socket = null;
let authenticated = false;
let queued = [];

export function getSocket() {
  if (socket) return socket;

  socket = io({
    transports: ["websocket"],
    autoConnect: true
  });

  const rawEmit = socket.emit.bind(socket);

  socket.on("connect", () => {
    authenticated = false;
    rawEmit("session:hello", ensureSession());
  });

  socket.on("session:authenticated", () => {
    authenticated = true;
    const pending = queued;
    queued = [];
    pending.forEach((args) => rawEmit(...args));
  });

  socket.on("disconnect", () => {
    authenticated = false;
  });

  // Hold every emit until the server has acknowledged the session.
  //
  // Callers emit as soon as they mount: Room.jsx registers its listeners and
  // calls room:join synchronously. Socket.IO buffers emits made before the
  // connection opens and flushes them on connect, but it flushes them ahead of
  // our own "connect" handler, so room:join arrived before session:hello and
  // the server rejected it with NO_SESSION. The room then sat at 0 players.
  socket.emit = (...args) => {
    if (authenticated || args[0] === "session:hello") {
      return rawEmit(...args);
    }
    queued.push(args);
    return socket;
  };

  return socket;
}
