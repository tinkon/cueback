# @cueback/podcast

The **podcast profile** for Cueback — the medium-specific half of the protocol,
and the only profile implemented in V1.

`@cueback/core` stays media-neutral; anything that only makes sense for audio
episodes lives here:

- `PlaybackEvent` / `PlaybackEventType` — the raw, server-internal signals an
  app uploads (started, completed, skipped_forward, …), including the 0.3
  `event_id` idempotency key (client-minted UUID, RECOMMENDED). Assistants
  never see these; they see `ConsumptionReceipt`s built from them. The event
  *object* is published (a profile defines its event vocabulary — SPEC.md §14,
  §22 item 4); its transport is the reference player's implementation detail
  (SPEC.md Appendix A).
- `EpisodeSearchResult` — one row of podcast catalog search, including the
  `match_basis` disclosure (re-exported from core, where the enum is defined
  because its values are generic across media).

Consumer tolerance (SPEC.md §3) applies here too: `PlaybackEvent.type` and
`match_basis` parse unknown future values as plain strings (the server —
the consumer of events — ignores types it does not know), while
`PlaybackEventTypeSchema` itself stays a closed enum for producers. The
podcast profile's units for the core `{unit, value}` measures are
`"seconds"` (both `content_length` and feedback `location`).

Zod v3 schemas are the source of truth; TypeScript types are inferred with
`z.infer`. This package depends only on `@cueback/core` and `zod`, and must
never import from an implementation, so it stays standalone.

The canonical specification is [SPEC.md](https://github.com/tinkon/cueback/blob/main/SPEC.md); the assistant-facing
tool surface is [MCP-TOOLS.md](https://github.com/tinkon/cueback/blob/main/MCP-TOOLS.md).

## License

Apache License 2.0. See [LICENSE](https://github.com/tinkon/cueback/blob/main/LICENSE) and [NOTICE](https://github.com/tinkon/cueback/blob/main/NOTICE).
