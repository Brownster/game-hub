export async function createRoom({ gameKey, mode }) {
  const res = await fetch("/api/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameKey, mode })
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
