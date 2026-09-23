# Security notes (hub)

**Threat model**: GameHub runs on the home LAN or over Tailscale. The network is the
trust boundary — device authentication happens in Tailscale, and every player is a
family member. The app defends against malformed input, accidental impersonation and
runaway clients. It does **not** defend against a motivated attacker, and must not be
exposed to the public internet without the work in "If this ever goes public" below.

## What is in place

| Concern | Where | Notes |
|---|---|---|
| Input validation | `src/util/inputValidation.js` | Join codes, display names, player IDs, game keys/modes, action types, chat messages |
| Rate limiting | `src/util/rateLimiter.js` | Sliding window, in-process; chat, game actions, room joins |
| Host authorization | `src/socket.js` | Host-only actions check `session.playerId` against the room host |
| Room capacity | `canJoinRoom()` in `src/rooms/roomService.js` | Also supports private/invite-only rooms, unused on LAN |

## Known and accepted

- **Identity is client-supplied.** `session:hello` takes the `playerId` the browser
  sends. A family member who edits localStorage can act as another player. Accepted
  under the threat model above.
- **Rate limiter is per-process and in-memory.** Fine for one hub container; it would
  need Redis backing if the hub is ever scaled out.

## History

An earlier pass (FIN-006, Jan 2026) added HMAC session tokens and a `POST /api/session`
endpoint. That work was reverted in Phase 0 because:

1. The client was never updated to send a token, so it broke every socket connection.
2. `POST /api/session` signed whatever `playerId` the caller supplied, proving only
   that the server issued the token — not who asked for it. The impersonation hole it
   claimed to close was still open.
3. `sessionAuth.js` and `rateLimiter.js` held the event loop open with un-`unref`'d
   `setInterval`s, so `npm test` never terminated. The report claiming those tests
   passed was written from runs that never completed.

The validation, rate limiting and host-authorization parts of that work were kept.

## If this ever goes public

In rough priority order: server-minted player IDs (client sends a display name, server
issues the identity), session store in Redis rather than process memory, Redis-backed
rate limiting, CORS lockdown, and a look at room-code entropy (4 characters is fine
against accidents, not against enumeration).
