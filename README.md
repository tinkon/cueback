# Cueback

An open MCP convention for the round trip between an assistant that curates
content and the app where a person actually consumes it.

## The problem

Assistants are good at deciding what someone should listen to next: they hold
the conversation, the goal behind it, and enough judgment to say "these four,
in this order, for these reasons." But the loop is broken in both directions.
Downstream, the picks leave the chat as a wall of links, stripped of the *why*,
half of them paywalled or hallucinated. Upstream, nothing comes back — the
assistant never learns that three of four landed, that the fourth was abandoned
six minutes in, or that the user wrote "too basic, and the host talks over
everyone."

The obvious fix — stream the user's listening history to the assistant — is
surveillance. Cueback is the feedback loop built to not be that: a compact,
permissioned round trip in which the assistant sends scoped intent out and gets
scoped evidence back, and the user controls both directions.

## The decisions

- **Receipts, not raw logs.** Raw consumption events never leave the server;
  what crosses back is a compact `ConsumptionReceipt` — outcome, progress, time
  spent, the user's words — gated by a per-assistant scope
  ([SPEC.md §16](./SPEC.md#16-consumptionreceipt),
  [§21](./SPEC.md#21-privacy-boundaries-summary)).
- **Verbatim, never classified.** What the user writes is stored and returned
  exactly as written — the server must not summarize, sentiment-score, or
  classify it; interpretation belongs to the model that has the conversation
  ([the verbatim rule](./SPEC.md#the-verbatim-rule-normative)).
- **A brief, not a memory dump.** The only inbound context object is a scoped
  `Brief` — goal, time window, stated preferences, a retention policy — never
  conversation history or an assistant's memory
  ([SPEC.md §7](./SPEC.md#7-brief)).
- **Resolution honesty.** When content cannot be played, the server says exactly
  why in a machine-readable vocabulary — `subscription_only`,
  `spotify_exclusive`, `removed_by_publisher`, `resolution_failed`, and friends —
  instead of handing the user a dead link
  ([SPEC.md §10](./SPEC.md#10-resolutionresult-and-unavailablereason)).
- **Interpretation caveats are normative.** Unfinished may mean the commute
  ended, not dislike; a completed episode may have autoplayed, which is not an
  endorsement — assistants are bound not to over-read passive signals
  ([receipt-interpretation caveats](./SPEC.md#receipt-interpretation-caveats-normative-guidance-for-assistants)).
- **Per-assistant revocation.** Each assistant connection carries its own scopes
  and is revocable on its own; cutting one assistant off does not touch another
  ([SPEC.md §19](./SPEC.md#19-assistantconnection-and-scope)).

## The evidence

The loop has been measured, not just argued. A blinded A/B evaluation — the same
curation tasks with the user's standing feedback served versus withheld, including
a cross-model round — showed served notes visibly reshaping what got picked and
why, including where the notes and the topic at hand shared no vocabulary, with no
fabricated feedback in any control arm. The shape also survived adversarial review
of its own honesty claims before it was promoted into the protocol
([SPEC.md §17](./SPEC.md#17-standingfeedback)).

## Repository map

| Path | What it is |
|---|---|
| [SPEC.md](./SPEC.md) | The canonical specification. Every protocol object, its fields, and its normative semantics. |
| [MCP-TOOLS.md](./MCP-TOOLS.md) | The assistant-facing tool surface: eleven tools, their inputs, results, scopes, and errors. |
| [DIRECTION.md](./DIRECTION.md) | Why the protocol looks like this — the design argument behind the shapes. |
| [packages/core](./packages/core) | `@cueback/core` — media-neutral schemas and types. |
| [packages/podcast](./packages/podcast) | `@cueback/podcast` — the podcast profile. |

Start with [SPEC.md](./SPEC.md). Together with [MCP-TOOLS.md](./MCP-TOOLS.md) it
fully specifies what a conforming implementation must do, and on any
disagreement between the spec and an implementation, the spec wins.

## Using the packages

Zod v3 schemas are the source of truth; TypeScript types are inferred with
`z.infer`. The wire format is JSON with `snake_case` keys, mirrored exactly in
TypeScript — there is no case-mapping layer. `@cueback/core` depends on `zod`
and `uuid` and nothing else; `@cueback/podcast` depends on `@cueback/core` and
`zod`. Neither imports from an implementation.

Until the packages are on the npm registry, install them as git dependencies
pinned to a release tag. The packages commit their compiled `dist/`, so a git
install needs no build step. `@cueback/podcast` declares its `@cueback/core`
dependency as a plain version, so the consumer points it at the same ref with an
override — in `pnpm-workspace.yaml` (pnpm 11 does not read overrides from
`package.json`; on pnpm 10 this route is the safe one either way), alongside permission for a git-resolved subdependency:

```jsonc
// package.json
"dependencies": {
  "@cueback/core": "github:tinkon/cueback#v0.4.0&path:packages/core",
  "@cueback/podcast": "github:tinkon/cueback#v0.4.0&path:packages/podcast"
}
```

```yaml
# pnpm-workspace.yaml
blockExoticSubdeps: false
overrides:
  "@cueback/core": "github:tinkon/cueback#v0.4.0&path:packages/core"
```

`blockExoticSubdeps` is a global switch with no per-package allowlist: setting it
`false` permits *any* transitive dependency in that project to resolve to a git
ref, not just this one. It is the price of a git install, and it goes away when
these packages are on the registry — a consumer who would rather not pay it
should wait for the npm release.

The packages are ESM-only (`type: module`, `exports` with `import` and no
`require`) and expect Node 22 or newer.

To work on the repo itself:

```sh
pnpm install
pnpm build
pnpm test
```

## Status

**v0.4, pre-1.0.** The 0.x line is additive-only from here: a minor version may
add optional fields, enum values, tools, and content types, and may not remove
or rename anything. Consumers accept any `0.x` document and ignore fields they
do not recognize. A second implemented media profile is the gate for 1.0 — one
medium cannot prove media-neutrality, and podcasts are the only profile
implemented today; the article content type ships as schemas only. Publication
to the npm registry is planned but not yet done — until then, git-tag installs
(above) are the supported path.

The reference implementation is **Rovyn** ([rovyn.app](https://rovyn.app)): a
server and an iOS player that speak Cueback's podcast profile. The specification
is the authority; the reference implementation conforms to it.

## License

Apache License 2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
