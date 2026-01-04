const STORAGE_KEY = "gamehub:session";

export function getSession() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function ensureSession() {
  const existing = getSession();
  if (existing?.playerId && existing?.displayName) return existing;

  const fresh = {
    playerId: crypto.randomUUID(),
    displayName: "Player"
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function updateDisplayName(displayName) {
  const current = ensureSession();
  const updated = { ...current, displayName };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
