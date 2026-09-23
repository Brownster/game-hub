export async function createRoom({ maxPlayers = 2 } = {}) {
  // POST /api/rooms creates a game-agnostic room and reads only maxPlayers.
  // It previously took gameKey and mode, which the server silently ignored.
  // Callers choose the game afterwards, over the socket.
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ maxPlayers })
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "CREATE_ROOM_FAILED");
  }

  return res.json();
}

export async function getRoomByCode(code) {
  const res = await fetch(`/api/rooms/by-code/${code}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.error || "ROOM_NOT_FOUND");
  }

  return res.json();
}
