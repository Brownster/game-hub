# Family Game Hub

A LAN-friendly game hub that runs on your Pi NAS. Includes Reversi (Othello) with room codes, Wordle (daily/free/VS), Draw & Guess (party), and an open-arena SERPENT.IO mode.

## Quick start

```bash
docker compose up -d --build
```

Open `http://<pi-ip>:8081` from any phone or desktop on your LAN.

## How it works

- `web` serves the UI and proxies `/api` + `/socket.io` to the hub (single origin).
- `hub` handles rooms, game state, and real-time WebSocket updates.
- `redis` stores room state so multiple games can run at once.
- Audio assets live in `services/web/public/audio` and play after the first user interaction.
- SERPENT.IO is served from the same hub via the `/slither` Socket.IO namespace.
- Wordle daily and VS modes use server-backed state + LAN leaderboards.

## Local development (optional)

In two terminals:

```bash
cd services/hub
npm install
npm run dev
```

```bash
cd services/web
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Notes

- Room codes are 4 characters; share the lobby link to join.
- Refreshing the page re-joins using the saved player ID.
