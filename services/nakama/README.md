# Future Connected World Service

The current Level 0 alpha is intentionally local-first. This directory records the backend boundary without pretending that production multiplayer exists.

## Intended stack

- Nakama for authentication, authoritative encounter matches, presence, text chat, social state, and permissioned storage.
- PostgreSQL for durable character, inventory, trace, exit, and world-event state.
- A separate regional simulation service only when active encounter cells become too expensive for Nakama's runtime.
- LiveKit or an equivalent WebRTC service later for proximity voice.

Vercel hosts only the browser client. It must not be treated as the authoritative realtime game server.

## Authority rules

Connected World owns:

- Character creation and starter roll.
- Item instance creation, revision, ownership, and destruction.
- Atomic trades through escrow or a transaction.
- World Day.
- Validated Exposure progress.
- Manila Room encounter-cell assignment.
- Shared marks, notes, and dropped objects.
- Exit eligibility and companion transfers.
- Chat, block, mute, reports, and moderation identity.

The client submits commands and receives outcomes. It never writes authoritative totals or item ownership directly.

## Future local development

Add a pinned Docker Compose environment containing Nakama and PostgreSQL only when the local vertical slice is stable enough to support a real connected-room milestone. Keep protocol definitions in `src/protocol/` independent from the Nakama SDK so another client or server implementation can use them.
