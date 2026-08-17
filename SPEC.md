# Cueback Protocol Specification — v0.4

Status: living (0.4 revision, 2026-08-09 — the final pre-publication break, §4).

**This document is canonical.** For protocol objects, their semantics, and the MCP tool
conventions, this specification is the authority: implementations — including the
reference implementation — conform to it, and on any disagreement between this document
and an implementation, this document wins. The published schema packages
(`@cueback/core`, `@cueback/podcast`) are the protocol's executable companion: Zod
schemas whose inferred types mirror the shapes specified here. One delegation is
deliberate: the exact numeric ceilings on string fields are published in the schemas,
and this document's bounds table (§5) is informative for the numbers — so the values
cannot drift between prose and validator.

Why the protocol looks like this: [DIRECTION.md](./DIRECTION.md).
Assistant-facing tool surface: [MCP-TOOLS.md](./MCP-TOOLS.md).

**Boundary (declared in 0.3).** Cueback is the **assistant ↔ server** protocol: the
objects and MCP tool conventions by which an assistant hands curation to a consumption
server and receives grounded plans and consumption receipts back. How a *player app*
talks to its own server — playback-event transport, device auth, link claiming, audio
delivery — is that implementation's private business, documented here only as
**non-normative** implementation notes (Appendix A: the reference player). Profile event
*objects* (e.g. `PlaybackEvent`, §14) remain published — a profile defines its event
vocabulary — but their transport is not part of the protocol. One object is **DRAFT**
(non-normative, unimplemented): `AssistantHandoff` (§18); see Appendix B.

---

## 1. Philosophy

Cueback is an open MCP convention for handing AI-curated content to the apps where users
consume it and returning lightweight consumption context and user feedback to the
assistant. It rests on a strict division of labor:

- **The assistant curates.** It owns editorial judgment: which content addresses the
  user's goal, in what order, with which contrasting perspectives, and why each item is
  worth the user's time. It brings broad context (the conversation, web search, prior
  receipts when permitted).
- **The app grounds and reports.** The app/server owns ground truth: whether the content
  actually exists in a public or user-authorized source, whether its media is reachable,
  its real duration, whether the user already consumed it. It delivers the content and
  returns compact, permissioned *consumption receipts*.

The core invariant (stated first for podcasts, generalized here):

> **The assistant can discover content anywhere, but only the consumption app/server can
> declare it playable. Discovery is open-ended; consumption is catalog-grounded.**

Concretely: assistants pass around `ContentRef` (possibly unresolved hearsay — a URL, a
guid, a title). Only the server converts a ref into `ResolvedContent` (catalog-backed,
validated), and only resolved content can enter a plan. When resolution fails, the server
says so with a machine-readable `UnavailableReason` so the assistant can pick a
replacement or show an external link.

A second invariant governs data flow in the other direction: **assistants receive
summaries, never raw logs** (§16, §19 below), and **the app receives a scoped brief,
never the assistant's memory** (§7).

The design principle behind every shape here: **structure observable behavior, preserve
human expression, let the assistant interpret meaning.** Deterministic, media-objective
facts (outcome, progress, time spent) are typed and enumerated; the user's own words are
carried verbatim and never classified by the server; meaning is the assistant's job.

**Media neutrality.** Cueback objects are media-neutral: `ContentRef` and
`ResolvedContent` are discriminated unions on `content_type`, and receipts talk about
`content_id` / `source_title` / `time_spent_minutes` rather than episodes and minutes of
audio. V1 implements exactly one profile, `podcast_episode`. The `article` variants exist
as schemas only — nothing resolves them, and every server path rejects them with
`unsupported_content_type` (§10).

**Vendor neutrality.** The protocol is independent of any single AI vendor. ChatGPT,
Claude, Gemini, local assistants, and future systems use the same objects and the same
MCP tools, each through its own independently permissioned `AssistantConnection`.

## 2. Wire conventions

- JSON, `snake_case` keys (`available_minutes`, `progress_percent`).
- Timestamps: ISO 8601 UTC strings, e.g. `"2026-07-29T18:12:03Z"`.
- Durations: `*_seconds` integers, except briefs which use `available_minutes` and
  receipts which use `time_spent_minutes`.
- IDs: prefixed UUIDv7 strings — `show_…`, `ep_…`, `pl_…` (plan), `rec_…`
  (recommendation), `rcpt_…`, `conn_…`, `hf_…`, `dev_…`, `user_…`. The prefix is part of
  the ID; IDs are opaque beyond their prefix. Since 0.3 the media-neutral objects take
  the opacity seriously: `content_id` fields (`ConsumptionReceipt`, `HandoffContent`,
  `NewRecommendation`) validate only the `<prefix>_<body>` shape, never a specific
  prefix — a future profile mints its own content ids without a core release. Profile
  objects still pin their own prefixes (`ResolvedPodcastEpisode.episode_id` is `ep_…`).
- Enums are lowercase `snake_case` string literals.
- **Every wire string is bounded** (0.4). Every string field in every protocol object
  carries an explicit maximum length in the published schemas; see §5 for the principle
  and the ceiling classes.

## 3. Versioning and compatibility

The protocol version is a single string, currently:

```json
"cueback_version": "0.4"
```

- **Where it appears.** Every protocol object that travels as a standalone top-level
  document carries `cueback_version`. In 0.4 these are `ConsumptionPlan` and
  `ConsumptionReceipt` (plus the draft `AssistantHandoff`). Embedded objects (`Brief`
  inside a plan, `Recommendation`, `StructuredFeedback`, `StandingFeedback`, …) are
  versioned by their container or by the tool/REST envelope that carries them.
- **Producers stamp; consumers tolerate.** A producer stamps the exact version it
  implements (`"0.4"`). A consumer MUST accept any `0.x` version — the published
  schemas validate `cueback_version` against `^0\.\d+(\.\d+)?$`, never a literal —
  because minors are additive (below) and a 0.4 consumer must parse a 0.5 document. A
  major bump is the only version a consumer may reject outright.
- **Unknown fields are ignored** (tolerant reader, rule 1). A consumer (assistant, app,
  or server) MUST accept and silently ignore object fields it does not recognize. Never
  fail validation on an unknown key. (The published schemas use non-strict objects for
  this reason.)
- **Minor versions are additive.** Within a major line (`0.x`, later `1.x`), a version
  bump may only: add optional fields, add new enum values, add new tools, **add new
  content types**. It may not remove or rename fields, change types, tighten a bound, or
  make an optional field required.
- **Unknown enum values** (tolerant reader, rule 2). Because minors may add enum values,
  consumers MUST NOT hard-fail on unknown enum values and SHOULD handle them
  conservatively — treat an unknown `UnavailableReason` as generic unavailability, an
  unknown `content_type` as content this consumer cannot handle (the schemas parse it as
  *unrecognized content*), an unknown `PlaybackEvent.type` as ignorable. The published
  schemas implement this as tolerant unions (`tolerantEnum` in `@cueback/core`): a known
  value keeps its literal type, an unknown value parses and is preserved **verbatim** as
  a plain string (never collapsed to a synthetic "unknown" — the reader is usually an
  assistant, and the raw string is actionable). Producer-side *input* schemas stay
  strict so typos are rejected at the door; narrow tolerant values with `isKnown(...)`.
  Scope note: this rule binds consumers of *protocol documents* (assistants and
  servers). A player app that is version-locked to its own server (Appendix A) may
  decode strictly — the reference player does.
- **Breaking changes bump the major.** There is no in-band version negotiation in 0.x;
  a server that does not support a document's major version rejects it with a validation
  error.
- **1.0 gate.** A second implemented media profile is a prerequisite for 1.0 — one
  medium cannot prove media-neutrality.

## 4. Version history

Cueback had no external users before 0.4, so each pre-publication revision was shipped
as a clean cut — no aliases, no compatibility shims. **0.4 is the last such break.** It
is the version that precedes publication; from here the 0.x line is additive-only under
the §3 rules.

| Version | Date | What it was |
|---|---|---|
| 0.1 | — | ListenMesh: the same loop, hard-coded to podcasts. |
| 0.2 | 2026-07-31 | The generalization: media-neutral objects (`ContentRef`, `ResolvedContent`, `ConsumptionPlan`, `ConsumptionReceipt`), the Cueback/Rovyn split, the `consumption` block + first-class verbatim `user_feedback` restructure. |
| 0.3 | 2026-08-02 | **The boundary declaration**: Cueback fixed as the assistant ↔ server protocol, app ↔ server transport declared implementation detail (Appendix A). Also: the resolver honesty split (`resolution_failed` vs `no_public_feed`), receipt attribution/echo fields, `content_length`, `UserFeedbackEntry.location`, tolerant-reader machinery (`tolerantEnum`, unrecognized-content fallbacks), `assistant_name` opened to a slug, `StructuredFeedback.direction` removed. |
| 0.4 | 2026-08-09 | **The final pre-publication break**: an explicit length bound on every wire string field (§5) — a narrowing, hence a break — and `standing_feedback` promoted from a reference-implementation envelope extension into a protocol object (§17). This document became self-contained and canonical. |

Notes for readers of stored documents:

- Receipts are stored snapshots: rows written under an older minor keep their stored
  `cueback_version` and shape, so one page of receipts may mix `"0.2"`, `"0.3"`, and
  `"0.4"`. A 0.2 receipt lacks the attribution fields and may carry the retired
  `StructuredFeedback.direction` chip — read it as a weaker restatement of `value` and
  expect it never again.
- The tolerant-reader rules (§3) are what make mixed pages safe: parse tolerantly,
  never reject a page over an old document.

## 5. String bounds (0.4)

As of 0.4, **every string field in every protocol object carries an explicit maximum
length**. An unbounded wire string is an unpriced liability for every implementer —
storage, indexing, token budgets, UI — and a published protocol should not ask its
implementers to discover that individually.

The principle behind the ceilings:

- **Expression is widest.** The user's own words are the highest-value bytes in the
  protocol; their ceiling is set so that no plausible human note ever hits it.
- **Editorial is roomy.** Assistant-authored display prose (goals, whys, titles,
  preferences) gets generous room — these are sentences and short paragraphs, not
  documents.
- **Machine-ish is tight.** Units, slugs, tags, enum-adjacent labels are short by
  nature, and a tight bound keeps them honest.

Ceiling classes (informative — **the authoritative values are the ones published in the
schemas**, `@cueback/core` / `@cueback/podcast`; if this table and a published schema
disagree, the schema carries the current number):

| Class | Ceiling class | Example fields |
|---|---|---|
| Verbatim user expression | ~20 000 chars | `UserFeedbackEntry.text`, `record_feedback.user_feedback`, `AssistantHandoff.user_question` |
| Editorial / display prose | ~2 000 chars | `Brief.goal`, `Recommendation.why`, `goal_supported`, `ConsumptionPlan.title`, `user_title`, `preferences[]` entries, descriptions and excerpts |
| Tags and short labels | ≤ 20 entries × ≤ 40 chars | `StructuredFeedback.tags` |
| Machine-ish strings | ≤ 32–64 chars, often pattern-bound | `ContentMeasure.unit` (≤ 32), `assistant_name` (slug, ≤ 32) |
| IDs, URLs, timestamps | format-bound plus a length ceiling | all `*_id`, `*_url`, `*_at` fields |

Semantics of a bound:

- A bound is a **transport ceiling, not a display contract**. Display guidance (e.g.
  "write `goal` as one scannable line", §7) remains guidance; the ceiling exists so a
  conforming implementation can size storage and budgets, not to enforce style.
- A producer MUST NOT emit a string over its bound. A server receiving over-bound input
  rejects it with a validation error — it MUST NOT silently truncate what a producer
  sent (the one narrow exception is `StandingFeedback`'s flagged truncation, §17, which
  is a disclosed re-serving of already-stored words, not an edit at the write door).
- Under §3, a later minor may **raise** a bound (additive) but never lower one.

## 6. Object index

| Object | Package | Direction / role | Spec section |
|---|---|---|---|
| `Brief` | core | assistant → server; the only inbound context object | §7 |
| `ContentRef` | core | assistant → server; unresolved reference | §8 |
| `ResolvedContent` | core | server → assistant/app; grounded content | §9 |
| `ResolutionResult` + `UnavailableReason` | core | server → assistant; consumability verdict | §10 |
| `ConsumptionPlan` | core | server → assistant/app; top-level document | §11 |
| `Recommendation` (+ `NewRecommendation`) | core | inside `ConsumptionPlan` / creation input | §12 |
| `PlanUpdateOp` | core | assistant or user → server; edit operations | §13 |
| `PlaybackEvent` | podcast | app → server **only**; never leaves the server | §14 |
| `StructuredFeedback` | core | user (via app or assistant) → server | §15 |
| `ConsumptionReceipt` | core | server → assistant; top-level document, summary only | §16 |
| `StandingFeedback` | core | server → assistant; envelope block on carrier tools (optional capability) | §17 |
| `AssistantConnection` + `Scope` | core | the permission envelope | §19 |

Draft object (non-normative, unimplemented — Appendix B): `AssistantHandoff` (§18).
`PlaybackEvent` (§14) is a published podcast-profile *object* whose transport is
app↔server implementation detail (Appendix A).

`@cueback/podcast` also defines `EpisodeSearchResult`, the result shape of the
podcast-profile `search_episodes` tool (documented in
[MCP-TOOLS.md](./MCP-TOOLS.md) §1).

---

## 7. `Brief`

The scoped statement of intent the assistant sends when creating a plan. It is the
**only** inbound context object in the protocol: the assistant never sends conversation
history, user memory, or a profile. It sends exactly the information needed to build
*this* plan.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `goal` | string | yes | What the user is trying to learn, decide, or accomplish. Free text, user-goal-shaped, not a search query. Also **display text** — one scannable line; see "Display" below. |
| `available_minutes` | integer | no | Time the user has for this plan. Curation should fit total duration to this budget. |
| `knowledge_level` | `"beginner"` \| `"intermediate"` \| `"advanced"` | no | User's current level on the goal topic. Guides difficulty of picks. |
| `preferences` | string[] | no | Short curation directives (e.g. `"prefer practitioners"`, `"include one skeptical perspective"`). Directives, not a user profile — see privacy note below. |
| `retention` | `"playlist_lifetime"` \| `"session"` \| `"persistent"` | yes | How long the server may keep this brief. See retention semantics. |

Example:

```json
{
  "goal": "Understand the economics of AI coding agents",
  "available_minutes": 120,
  "knowledge_level": "intermediate",
  "preferences": [
    "prefer practitioners",
    "avoid beginner AI explanations",
    "include one skeptical perspective"
  ],
  "retention": "playlist_lifetime"
}
```

**Semantics.** The server stores the brief with the plan so the app can display "why
this plan exists" and so receipts can carry `recommended_for`. The server performs **no
inference** over briefs — no profile building, no recommendation engine; the brief
exists for display, receipt context, and duration fitting.

**Display.** `goal` is the string clients render as the plan's **headline** — typically
set large and clamped to a line or two. Assistants SHOULD write it as ONE scannable line
(aim ≤ ~60 characters); detail about what the plan covers, why, or under what
constraints belongs in `preferences`, or in a recommendation's `goal_supported` / `why`.
A `goal` written as a paragraph is a truncated headline. `ConsumptionPlan.title` (§11)
is the plan's short *name* and a different job; the two may be close, but SHOULD NOT be
the same string, since a client may show both at once. The 0.4 length bound on `goal` is
a transport ceiling in the editorial class (§5), far above any sensible headline — the
one-line guidance remains guidance for authors, not a wire constraint. `goal` is the
headline **by default, not unconditionally**: a user who renames the plan sets
`ConsumptionPlan.user_title` (§11), which outranks it on screen. The `goal` itself is
never rewritten by that — it stays exactly as the assistant wrote it.

**Retention semantics** (`retention`):

- `playlist_lifetime` (default expectation) — the brief lives exactly as long as the
  plan. When the plan is archived or deleted, the server purges the brief ("temporary
  interests expire", §21). The enum value is kept verbatim from 0.1 for the sake of
  stored rows and the app's vocabulary; read it as "plan lifetime".
- `session` — the brief may be used only while the creating MCP session is active
  (validation, duration fitting, recommendation annotation). The server MUST NOT persist
  it afterward: the stored brief is cleared once creation completes, and receipts for
  this plan derive `recommended_for` from per-recommendation `goal_supported` instead of
  `brief.goal`.
- `persistent` — the user has an ongoing goal (e.g. a months-long learning project); the
  brief is retained until the user deletes it. Assistants should only use this when the
  user's intent is clearly durable.

**Privacy boundary.** `preferences` entries are curation directives for this plan, not
durable taste data, and assistants MUST NOT use them to smuggle a memory dump (no
biographies, no aggregated history, no data unrelated to this plan's goal). The server
treats a brief as scoped input, never as a user profile.

## 8. `ContentRef`

An assistant-side reference to a piece of content, possibly unresolved. This is what an
assistant holds after web search: maybe a page URL, maybe a guid it saw in a feed, maybe
just a title and a source name. A ref makes **no claim of consumability**.

`ContentRef` is a discriminated union on `content_type`.

### `content_type: "podcast_episode"` (implemented)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `content_type` | `"podcast_episode"` | yes | Union discriminator. |
| `episode_id` | string (`ep_…`) | no | Catalog ID, when the assistant already has one (e.g. from `search_episodes`). Strongest identifier. |
| `guid` | string | no | The RSS `<guid>` of the episode. Only reliable in combination with `feed_url`. |
| `feed_url` | string (URL) | no | The show's RSS feed URL. |
| `episode_url` | string (URL) | no | A public episode page or audio URL discovered on the web. |
| `title` | string | no | Hint: episode title as seen by the assistant. |
| `show_title` | string | no | Hint: show name. |
| `published_at` | string (ISO 8601) | no | Hint: publication date. |

At least one of `episode_id`, `guid`, `feed_url`, `episode_url` must be present; the hint
fields alone are not a valid ref. Resolution precedence (normative for servers):
`episode_id` → `guid` + `feed_url` → `episode_url` → hint-assisted lookup (podcast
directory / catalog search on `title`/`show_title`/`published_at`).

```json
{
  "content_type": "podcast_episode",
  "episode_url": "https://practicalai.example.com/episodes/economics-of-ai-inference",
  "title": "The Economics of AI Inference",
  "show_title": "Practical AI Infrastructure",
  "published_at": "2026-07-14T09:00:00Z"
}
```

### `content_type: "article"` (schema only)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `content_type` | `"article"` | yes | Union discriminator. |
| `url` | string (URL) | yes | The article URL. |
| `title` | string | no | Hint. |
| `author` | string | no | Hint. |
| `published_at` | string (ISO 8601) | no | Hint. |

**No server path resolves an article ref in V1.** `resolve_content` returns
`{ "status": "unavailable", "reason": "unsupported_content_type" }`, and `create_plan`
rejects article recommendations with a validation error. The variant exists so the union
is genuinely a union — it keeps the discriminator, the guard, and the media-neutral field
names honest until a real second profile ships
([DIRECTION.md](./DIRECTION.md) §6).

### Unrecognized content (0.3 fallback)

A `ContentRef` (or `ResolvedContent`) whose `content_type` this release does not know
**parses** — as `{ content_type: string, … }` with its fields passed through — instead of
failing validation. This is the §3 "add new content types" rule made structural: a
reading profile must be addable WITHOUT a core release breaking existing validators.
Consumers treat unrecognized content as content they cannot handle (servers answer
`unavailable` / `unsupported_content_type`; apps render it unplayable). The fallback
refuses the *known* content types, so a malformed podcast or article ref still fails
validation rather than sliding through. Narrow with `isPodcastEpisodeRef` /
`isArticleRef` / `isResolvedPodcastEpisode`.

## 9. `ResolvedContent`

Content grounded by the server: it exists in the server's catalog, its media has been
validated, and its metadata is the server's ground truth (not the assistant's claim).
Only `ResolvedContent` appears inside plans. Also a discriminated union on
`content_type`.

### `content_type: "podcast_episode"`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `content_type` | `"podcast_episode"` | yes | Union discriminator. |
| `episode_id` | string (`ep_…`) | yes | Catalog episode ID. |
| `show_id` | string (`show_…`) | yes | Catalog show ID. |
| `title` | string | yes | Episode title from the feed. |
| `show_title` | string | yes | Show title from the feed. |
| `description` | string | no | Episode description / show notes (may be truncated). |
| `duration_seconds` | integer | yes | Validated duration. |
| `published_at` | string (ISO 8601) | yes | Publication timestamp from the feed. |
| `artwork_url` | string (URL) | no | Episode or show artwork. |
| `has_publisher_transcript` | boolean | yes | True only when the publisher supplies a transcript (RSS, Podcasting 2.0, or publisher page). V1 never generates transcripts. |
| `already_listened` | boolean | yes | True when this user has completed the episode. Lets assistants avoid re-recommending. Privacy-gated: reported as `false` to connections lacking the `receipts:read` scope. |

```json
{
  "content_type": "podcast_episode",
  "episode_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
  "show_id": "show_0198a7e0-4c1d-7a2b-8f3e-2b9d4c5e6f70",
  "title": "The Economics of AI Inference",
  "show_title": "Practical AI Infrastructure",
  "description": "Why inference margins, not training runs, decide who wins in AI infrastructure.",
  "duration_seconds": 3540,
  "published_at": "2026-07-14T09:00:00Z",
  "artwork_url": "https://cdn.example.com/art/practical-ai-infra.jpg",
  "has_publisher_transcript": true,
  "already_listened": false
}
```

### `content_type: "article"` (schema only)

`{ content_type, url, title, author?, published_at?, word_count? }`. No server path
produces one in V1.

## 10. `ResolutionResult` and `UnavailableReason`

The server's verdict on a `ContentRef`. Unavailability is an **expected outcome**, not an
error: the tool call succeeds and returns `status: "unavailable"` with a reason the
assistant can act on (suggest a replacement, or surface the item as an external link).

| Field | Type | Required | Meaning |
|---|---|---|---|
| `status` | `"playable"` \| `"unavailable"` | yes | Whether the content can enter a plan. |
| `content` | `ResolvedContent` | when `playable` | The grounded content. Absent when unavailable. |
| `reason` | `UnavailableReason` | when `unavailable` | Why consumption is impossible. Absent when playable. |

`UnavailableReason` enum:

| Value | Meaning |
|---|---|
| `subscription_only` | Content exists but requires a paid publisher subscription. |
| `private_feed_required` | Only available through a private feed the user has not added. |
| `spotify_exclusive` | Spotify-exclusive content; no public feed. |
| `apple_subscription` | Apple Podcasts subscription content; no public feed. |
| `removed_by_publisher` | Source exists but the content was withdrawn. |
| `no_public_feed` | **Verified world-fact**: no public RSS feed could be located for the show anywhere. |
| `audio_unreachable` | Feed and episode found, but the enclosure audio **definitively** failed validation: no enclosure URL, HTTP 404/410, or a non-audio body. A server must not return it for an *inconclusive* check — a probe that timed out, was refused, or answered ambiguously is not evidence of unavailability, and audio checked at resolve time is stale by play time anyway. |
| `unsupported_content_type` | The ref names a content type this server has no profile for. V1: every `article` ref, and every *unrecognized* `content_type` (§8). |
| `resolution_failed` | **The resolver failed** (0.3): a candidate feed would not fetch or parse, the match was ambiguous, the pipeline threw, or the server's own latency budget expired before the network answered. A retry or a better ref may succeed — this is a statement about the server, not the world. `no_public_feed` is reserved for the verified fact. |

```json
{ "status": "unavailable", "reason": "spotify_exclusive" }
```

**Semantics.** Resolution of a podcast ref runs the just-in-time import pipeline:
existing catalog → directory lookup → canonical publisher RSS feed → episode match →
enclosure/audio check → import. A successful resolve may permanently grow the catalog.
Consumers should treat unknown future `reason` values as generic unavailability (§3).

The enclosure/audio step is a **best-effort check, not a gate**: it can only *remove* an
episode on a definitive failure (see `audio_unreachable` above). Resolution is also
allowed to be **bounded in time** — a server that cannot finish inside its own latency
budget answers `resolution_failed` for what it could not reach and returns the verdicts
it did earn. Both rules follow from the same principle as the 0.3 honesty split: a
verdict is a claim, and a server may only make the claims it can actually support.

## 11. `ConsumptionPlan`

The top-level document representing an assistant-curated, server-grounded set of
recommendations — what the user opens in the app.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `cueback_version` | string | yes | The producer's protocol version (`"0.4"`); consumers accept any `0.x` (§3). |
| `plan_id` | string (`pl_…`) | yes | Plan ID. |
| `title` | string | yes | The plan's short **name**, chosen by the assistant — what a client puts in chrome and in sentences that refer to the plan. Distinct from `brief.goal`, the displayed headline (§7). |
| `user_title` | string | no | The plan's name **as the user set it** (additive, 2026-08-06). Absent unless the user renamed the plan. **User-authored**: a producer MUST NOT populate it from assistant input, and MUST NOT overwrite `title` or `brief.goal` when the user renames — those stay the assistant's expression (§1). Display precedence for the headline is `user_title` → `brief.goal` → `title`, first non-empty. Assistants read it; the protocol defines no way for one to write it. |
| `brief` | `Brief` | yes | The brief this plan was built from (cleared post-creation for `retention: "session"` briefs). |
| `recommendations` | `Recommendation[]` | yes | Ordered, `position` ascending. Removed recommendations may appear with `consumption_state: "removed"` for receipt/history purposes; apps hide them. |
| `created_by` | string | yes | Assistant slug of the creating connection (open since 0.3: `^[a-z0-9_-]{1,32}$`; `chatgpt` / `claude` / `gemini` / `other` are conventions). Displayed in the app ("Created by Claude"). |
| `created_at` | string (ISO 8601) | yes | Creation time. |
| `player_link` | string (URL) | no | Universal link that opens/claims this plan in the app, when one has been minted. |
| `total_duration_seconds` | integer | no | Total runtime of the non-removed recommendations, in seconds (0.3 — promoted from the tool-result envelope into the protocol object). Optional because a timeless medium may have none; the reference server always populates it. `brief.available_minutes` stays advisory. |

Example: see the `create_plan` / `get_plan` examples in [MCP-TOOLS.md](./MCP-TOOLS.md).

**Semantics.** A plan is jointly owned: the assistant curates it, the user controls it.
Plans are portable across assistants — any connection of the same user holding
`plans:read` can fetch a plan created by a different assistant (switching assistants
without losing state).

## 12. `Recommendation` and `NewRecommendation`

### `Recommendation` (server-produced, inside `ConsumptionPlan`)

| Field | Type | Required | Meaning |
|---|---|---|---|
| `recommendation_id` | string (`rec_…`) | yes | Stable ID; the handle for update ops. |
| `content` | `ResolvedContent` | yes | The grounded content. Never a bare ref. |
| `position` | integer | yes | 0-based position in the plan. |
| `why` | string | yes | The assistant's one- or two-sentence editorial justification, shown to the user. |
| `goal_supported` | string | no | Which part of the user's goal this recommendation addresses. |
| `match_basis` | `"metadata"` \| `"publisher_transcript"` | yes | Disclosure required by the V1 transcript policy: was the match based on metadata only, or on a publisher-provided transcript. Values may grow per medium. |
| `contrasting_perspective` | boolean | yes | True when this was chosen to challenge the plan's dominant viewpoint. |
| `locked` | boolean | yes | True when the user locked it. See §13 locked-item semantics. |
| `added_by` | `"assistant"` \| `"user"` | yes | Who added it. |
| `consumption_state` | `"not_started"` \| `"in_progress"` \| `"completed"` \| `"removed"` | no | Server-computed summary of the user's progress; present on reads (`get_plan`), absent at creation time. |

```json
{
  "recommendation_id": "rec_0198a9c1-4f5a-7b6c-8d7e-9f0a1b2c3d4e",
  "content": { "content_type": "podcast_episode", "episode_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c", "show_id": "show_0198a7e0-4c1d-7a2b-8f3e-2b9d4c5e6f70", "title": "The Economics of AI Inference", "show_title": "Practical AI Infrastructure", "duration_seconds": 3540, "published_at": "2026-07-14T09:00:00Z", "has_publisher_transcript": true, "already_listened": false },
  "position": 0,
  "why": "A practitioner walks through real inference cost curves — directly addresses the margin question.",
  "goal_supported": "Understand the economics of AI coding agents",
  "match_basis": "publisher_transcript",
  "contrasting_perspective": false,
  "locked": false,
  "added_by": "assistant",
  "consumption_state": "not_started"
}
```

### `NewRecommendation` (assistant-supplied creation input)

Used in `create_plan` and in `add`/`replace` update ops. The assistant supplies a
reference plus its editorial annotations; the server resolves and grounds it.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `content_id` | string (`ep_…` in V1) | one of | Catalog ID (e.g. from `search_episodes`). At least one of `content_id` / `ref` must be present. |
| `ref` | `ContentRef` | one of | Unresolved reference; the server runs resolution. |
| `why` | string | yes | Editorial justification (becomes `Recommendation.why`). |
| `goal_supported` | string | no | Goal linkage (becomes `Recommendation.goal_supported`). |
| `contrasting_perspective` | boolean | no | Defaults to `false`. |

`match_basis` is **not** assistant-supplied on the wire: the server sets it from how the
content was actually matched/validated (publisher transcript available and used vs
metadata only).

## 13. `PlanUpdateOp`

A discriminated union on `op`, applied in order as an **atomic batch**: if any op in a
batch is rejected, the whole batch fails and the plan is unchanged.

| Variant | Fields | Allowed actor | Meaning |
|---|---|---|---|
| `add` | `recommendation: NewRecommendation`, `position?` (integer) | assistant, user | Resolve and insert (append when `position` omitted). |
| `remove` | `recommendation_id` | assistant, user | Soft-remove (state becomes `removed`). |
| `reorder` | `recommendation_id`, `position` (integer) | assistant, user | Move to a new position. |
| `replace` | `recommendation_id`, `recommendation: NewRecommendation` | assistant, user | Swap one recommendation for another at the same position. |
| `lock` | `recommendation_id` | **user only** | Pin against assistant edits. |
| `unlock` | `recommendation_id` | **user only** | Release a lock. |

```json
[
  { "op": "remove", "recommendation_id": "rec_0198a9c1-5a6b-7c8d-9e0f-1a2b3c4d5e6f" },
  { "op": "add", "position": 1, "recommendation": {
      "ref": { "content_type": "podcast_episode", "episode_url": "https://gpuskeptic.example.com/ep/42" },
      "why": "The promised skeptical take: argues coding-agent margins collapse at scale.",
      "contrasting_perspective": true } }
]
```

**Actor attribution.** Ops arrive via two paths carrying the actor implicitly: the MCP
tool `update_plan` (actor = the authenticated assistant connection) and the
implementation's user-facing edit path (in the reference implementation, a REST route
used by the player app, actor = user). `add`ed recommendations get `added_by` set
accordingly.

**Locked-item semantics.** Locking is the user's veto over assistant curation ("lock an
episode so the assistant cannot remove it"):

- An assistant op that targets a locked recommendation — `remove`, `replace`, or
  `reorder` — is rejected (error code `locked_recommendation`), which fails the whole batch.
- `lock` / `unlock` ops from an assistant are rejected outright (`op_not_allowed`); only
  the user, through the app, may lock or unlock.
- Assistants may still `add`; a locked recommendation's numeric position may shift as a
  side effect of insertions or removals elsewhere. The lock protects membership and
  guards against explicit retargeting, not the absolute index.
- The user is never constrained by locks on their own edits (a user `remove` of a locked
  recommendation is legal; the app should confirm).

## 14. `PlaybackEvent` (podcast profile)

Fine-grained consumption telemetry for the podcast profile. Defined in
`@cueback/podcast`: a profile MUST publish its event object (§22), which is why the shape
is specified here — but the **transport** (the reference player's batched upload, its
envelope and flush rules) is app↔server implementation detail, **non-normative**,
documented in Appendix A. **Server-internal**: playback events are the raw material for
receipts and are never exposed to assistants over MCP (§21). Each media profile defines
its own raw event vocabulary; only the receipt crosses the boundary.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `type` | enum (below) | yes | What happened. Consumers (the server) tolerate unknown future values by ignoring them (§3). |
| `event_id` | string (UUID) | no, RECOMMENDED | Client-minted idempotency key (0.3), so an uploader retrying a batch whose acknowledgment was lost cannot double-count. |
| `episode_id` | string (`ep_…`) | yes | Episode concerned. |
| `recommendation_id` | string (`rec_…`) | no | Recommendation the play came from, when it came from a plan (lets receipts attribute outcomes to a recommendation). |
| `position_seconds` | integer | no | Playhead position when the event occurred. |
| `detail` | object (free-form JSON) | no | Type-specific payload, e.g. `{ "from_seconds": 610, "to_seconds": 655 }` for `skipped_forward` / `replayed_section`. |
| `occurred_at` | string (ISO 8601) | yes | Device-side timestamp (events may be uploaded late, e.g. after offline listening). |

`type` values:

| Value | Meaning |
|---|---|
| `started` | Playback began for this episode. |
| `completed` | Playback reached the end. |
| `removed_before_playing` | User removed the recommendation without ever starting it. |
| `skipped_forward` | A significant forward seek. |
| `replayed_section` | User scrubbed back and re-listened to a span. |
| `paused` | Playback paused. |
| `abandoned_queue` | User left the plan with recommendations unplayed. |

```json
{
  "type": "skipped_forward",
  "episode_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
  "position_seconds": 655,
  "detail": { "from_seconds": 610, "to_seconds": 655 },
  "occurred_at": "2026-07-29T08:24:11Z"
}
```

## 15. `StructuredFeedback`

Deliberate user judgment expressed through fixed controls. Every field is optional, but
**at least one field must be present**. Structured feedback always outweighs passive
consumption behavior (§16 caveats).

It is the **optional convenience** beside verbatim `user_feedback` (§16): one tap when
the user does not want to type. It never replaces the user's own words, and an assistant
should read both.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `value` | `"worth_my_time"` \| `"not_worth_my_time"` | no | Overall verdict. |
| `difficulty` | `"too_basic"` \| `"slightly_basic"` \| `"just_right"` \| `"slightly_technical"` \| `"too_technical"` | no | Difficulty relative to the user's level. |
| `length` | `"too_long"` \| `"fine"` \| `"too_short"` | no | Length verdict. |
| `flags` | array, subset of [`"too_repetitive"`, `"too_promotional"`] | no | Content complaints. |
| `tags` | string[] | no | Free-form short labels (e.g. `"good operator perspective"`). Bounded (§5): a tag is a label, not a note — words that need room belong in `user_feedback`. |

```json
{
  "value": "worth_my_time",
  "difficulty": "slightly_basic",
  "tags": ["good operator perspective", "more infrastructure economics"]
}
```

> **0.3 clean break**: `direction` ("more_like_this" / "less_like_this") was removed —
> it duplicated `value`'s signal, which already steers future curation. Receipts stored
> under 0.2 may still carry it; read it as a weaker restatement of `value` and expect
> it never again.

**Semantics.** Feedback reaches the server through two doors, recorded with its `source`:
the app UI (`source: "app"`) or an assistant relaying what the user said in chat
(`source: "assistant"`, via the `record_feedback` tool, requiring `feedback:write`).
Both doors also accept verbatim `user_feedback` text. Feedback is attached to the
content (and recommendation when known) and embedded into the corresponding
`ConsumptionReceipt`.

## 16. `ConsumptionReceipt`

The compact, top-level summary of what happened with one recommendation. Receipts are
what assistants get **instead of** raw consumption logs: playback events never leave
the server; the server's receipt builder distills them.

The receipt is deliberately two-layered — the principle of §1 made concrete. The
`consumption` block is deterministic and media-objective; `user_feedback` is the user's
own language, untouched.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `cueback_version` | string | yes | The producer's protocol version (`"0.4"`); consumers accept any `0.x` (§3), and a page of receipts may mix versions (older receipts are returned as stored). |
| `receipt_id` | string (`rcpt_…`) | yes | Receipt ID. Stable across rebuilds. |
| `content_type` | `"podcast_episode"` \| `"article"` | yes | Which profile the content belongs to. V1 always `podcast_episode`; unknown future values parse tolerantly (§3). |
| `content_id` | string (prefixed id) | yes | The content concerned. Any `<prefix>_<body>` id — opaque beyond its prefix (§2); the podcast profile mints `ep_…`. |
| `content_title` | string | yes | Denormalized title, so receipts are self-describing. |
| `source_title` | string | yes | Denormalized source name: show, publication, or channel. |
| `recommended_for` | string | no | The goal text this content was recommended against: **the recommendation's own `goal_supported` when the assistant stated one, else `brief.goal` — goal_supported-first, always.** Omitted for direct plays and scrubbed briefs. |
| `recommendation_id` | string (`rec_…`) | no | **0.3.** The recommendation this receipt reports on; present iff plan-attributed. |
| `plan_id` | string (`pl_…`) | no | **0.3.** The plan the play was attributed to; present iff plan-attributed. |
| `why` | string | no | **0.3.** Echo of the recommendation's `why`, when plan-attributed — so the reading assistant can adapt without a second `get_plan`. |
| `contrasting_perspective` | boolean | no | **0.3.** Echo of the recommendation's flag, when plan-attributed — "the skeptical pick landed badly" reads differently from "the on-thesis pick landed badly". |
| `content_length` | `{ unit, value }` | no | **0.3.** Media-neutral content size: the profile's unit plus a value (podcast: `{ "unit": "seconds", "value": duration_seconds }`; an article profile would use `"words"`). `unit` is a short machine-ish string (§5). Omitted when unknown. |
| `consumption` | object | yes | Deterministic block, below. |
| `consumption.outcome` | `"completed"` \| `"partial"` \| `"skipped"` \| `"removed"` | yes | Coarse outcome: finished; meaningful but unfinished; started then abandoned almost immediately; removed without consuming. Thresholds are implementation-defined in the receipt builder. |
| `consumption.progress_percent` | integer 0–100 | yes | Portion of the content actually consumed. |
| `consumption.time_spent_minutes` | integer | yes | Minutes of content actually consumed (skipped spans excluded). |
| `consumption.saved_at` | string (ISO 8601) | no | **0.4 additive (2026-08-10).** Present iff the user has bookmarked this content for their own later return, stamped when they did. A save is deterministic behavior, not judgment: it frequently happens *before* consuming, and it coexists with any verdict — including a negative one whose topic the user wants more of. Readers SHOULD treat it as context about the user's intentions, never as a stronger form of positive feedback. |
| `structured_feedback` | `StructuredFeedback` | no | The user's tapped judgment, when given (§15). Reflects the user's CURRENT judgment: the newest tap wins, and a withdrawn judgment is simply absent from subsequent receipts (clarified 2026-08-10 — behavioral, not a wire change). |
| `user_feedback` | `{ text, occurred_at, location? }[]` | no | **The user's own words**, chronological by `occurred_at` — when the user *said* it (an assistant relaying earlier speech timestamps it honestly via `record_feedback.occurred_at`). `location` (**0.3**, `{ unit, value }`, podcast unit `"seconds"`) is where in the content the note refers to; optional, and the reference app does not send it yet. See the verbatim rule below. |
| `created_at` | string (ISO 8601) | yes | When the receipt snapshot was taken. |

### The verbatim rule (normative)

`user_feedback` entries are stored and returned **exactly as the user expressed them**.
The server MUST NOT summarize, paraphrase, translate, truncate, sentiment-score,
classify, or reorder them; entries are chronological and each carries its own
`occurred_at`. A user who types "the middle third is where it actually gets concrete" has
said something no enum can hold, and the whole value is in the specific sentence.

Interpretation is the assistant's job — that is the trade the protocol makes. The server
structures behavior (the `consumption` block), preserves expression (`user_feedback`),
and leaves meaning to the model that has the conversation.

Assistants relaying feedback via `record_feedback` are bound by the same rule in the
other direction: pass what the user actually said, not a cleaned-up version of it, and
never synthesize feedback from your own reading of a receipt.

```json
{
  "cueback_version": "0.4",
  "receipt_id": "rcpt_0198b3d4-6e7f-7a8b-9c0d-1e2f3a4b5c6d",
  "content_type": "podcast_episode",
  "content_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
  "content_title": "The Economics of AI Inference",
  "source_title": "Practical AI Infrastructure",
  "recommended_for": "Evaluate AI infrastructure opportunities",
  "recommendation_id": "rec_0198a9c1-4f5a-7b6c-8d7e-9f0a1b2c3d4e",
  "plan_id": "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b",
  "why": "A practitioner walks through real inference cost curves.",
  "contrasting_perspective": false,
  "content_length": { "unit": "seconds", "value": 3540 },
  "consumption": {
    "outcome": "partial",
    "progress_percent": 78,
    "time_spent_minutes": 46
  },
  "structured_feedback": {
    "value": "worth_my_time",
    "difficulty": "slightly_basic",
    "tags": ["good operator perspective", "more infrastructure economics"]
  },
  "user_feedback": [
    {
      "text": "the cost-curve section was the useful part, the rest was setup",
      "occurred_at": "2026-07-29T21:38:12Z",
      "location": { "unit": "seconds", "value": 1980 }
    }
  ],
  "created_at": "2026-07-29T21:40:00Z"
}
```

### Receipt-interpretation caveats (normative guidance for assistants)

Receipts describe behavior, not verdicts. Assistants consuming receipts MUST NOT
over-interpret passive signals:

- **Unfinished may mean the commute ended**, not that the user disliked it.
  `outcome: "partial"` with high `progress_percent` is often a scheduling artifact.
- **Completed may have autoplayed.** `outcome: "completed"` alone is not an endorsement;
  look for corroborating feedback.
- **A forward skip may be an ad-skip**, not a rejection of the content around it.
- **One session is not a permanent preference.** Do not convert a single receipt into a
  durable taste profile; look for repeated patterns across receipts.
- **Feedback outweighs passive behavior.** When `user_feedback` or `structured_feedback`
  is present, it dominates any inference from `progress_percent` or `outcome` — and the
  user's words outrank the taps.

The same caveats bind the server-side receipt builder: it summarizes conservatively (e.g.
it does not label a heavily ad-skipped episode as "skipped").

## 17. `StandingFeedback` (0.4)

The standing corpus of what the user has **written** about their consumption, delivered
as an envelope block on tool results the assistant already requests. Promoted into the
protocol in 0.4 after shipping as a reference-implementation envelope extension (§20 —
it is the precedent for the extension-graduation path).

**Motivation.** In practice, assistants do not call a dedicated receipts tool
unprompted: unless the user asks about history, `get_recent_receipts` goes uncalled and
the user's accumulated feedback goes unread — precisely when it would have improved the
next plan. Data that rides the tools an assistant already calls in the course of
building gets used. The shape was validated before promotion: it survived adversarial
review of its honesty claims, and a blinded A/B evaluation (including a cross-model
round) showed served notes visibly reshaping builds — including across zero lexical
overlap between the notes and the topic at hand — with no fabricated feedback in any
control arm.

**The whole capability is OPTIONAL.** A conformant Cueback server may not implement
`standing_feedback` at all. A server that does implement it MUST follow the rules in
this section.

### Envelope keys

A server implementing the capability chooses its **carrier tools** — tools whose results
may carry, beside their own unchanged payload, up to two additional envelope keys.
Carriers SHOULD be tools an assistant calls in the course of building (the reference
implementation carries it on `resolve_content`, `resolve_content_batch`,
`search_episodes`, `list_shows`, and `create_plan`).

| Key | Type | Meaning |
|---|---|---|
| `standing_feedback` | `StandingFeedback` | The block, below. Present only when the server looked and found notes. |
| `standing_feedback_unchecked` | `true` | The server **attempted to look and could not** (query failure, latency budget, unreadable rows). Never present merely because nothing exists, and never present when a look was not attempted (e.g. a delivery-cadence window not being due is not a failure to report). |

### `StandingFeedback`

| Field | Type | Required | Meaning |
|---|---|---|---|
| `note` | string | yes | Server-authored framing: what this block is, what the selection and ordering were on *this* call, whether anything was cut or omitted, and how to reach the untruncated source of record (`get_recent_receipts`). It states only what the server actually computed — see the honesty rules below. |
| `notes` | `StandingFeedbackNote[]` | yes | The user's written notes, each with the context that stops a bare quote from misleading. |
| `more_on_file` | `true` | no | Present iff at least one qualifying note was **not** emitted, for any reason. A flag, not a count. |

### `StandingFeedbackNote`

Every field is **copied from one stored `ConsumptionReceipt`** — projected field by
field, never re-derived, never mixed across receipts.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `text` | string | yes | The user's words. Verbatim, unless `truncated` is present. |
| `truncated` | `true` | no | Present iff `text` was cut to fit the per-note ceiling. Truncation happens on a grapheme boundary with an appended ellipsis — the one edit ever made to the user's words, and always flagged. |
| `said_at` | string (ISO 8601) | yes | When the user said it (the receipt entry's `occurred_at`). |
| `content_id` | string (prefixed id) | yes | The content the note is about — and the `content_id` filter that redeems the full entry from `get_recent_receipts`. |
| `content_title` | string | yes | Denormalized title. |
| `source_title` | string | yes | Denormalized source name. |
| `recommended_for` | string | no | The goal the content was recommended under, **when a single such goal is knowable**. Omitted — never guessed — when the play was direct, the receipt carries no goal, or the same words exist under more than one goal (see below). |
| `consumption` | object | yes | The deterministic block of the *same* receipt the words came from — `outcome`, `progress_percent`, `time_spent_minutes` — restated exactly as stored. |

Example (as carried on a tool result):

```jsonc
{
  "results": [ /* … the tool's own payload, unchanged … */ ],
  "standing_feedback": {
    "note": "What this user has WRITTEN about their listening — …",
    "notes": [
      {
        "text": "The scripts for opening a skip-level conversation are the part I'll actually use — more episodes this concrete.",
        "said_at": "2026-06-11T09:02:44Z",
        "content_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
        "content_title": "How to build trust with your skip-level",
        "source_title": "Coaching for Leaders",
        "recommended_for": "Get better at skip-level relationships",
        "consumption": { "outcome": "completed", "progress_percent": 100, "time_spent_minutes": 41 }
      },
      {
        "text": "too basic",
        "said_at": "2026-07-01T09:00:00Z",
        "content_id": "ep_0198a7e3-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
        "content_title": "Term premium decomposition",
        "source_title": "Rates and Macro",
        // no recommended_for: the server has no single goal to attach these
        // words to, and it does not guess.
        "consumption": { "outcome": "skipped", "progress_percent": 4, "time_spent_minutes": 2 }
      }
    ],
    "more_on_file": true
  }
}
```

### Normative semantics

1. **Verbatim or flagged.** A note's `text` is the user's words exactly as stored, or a
   flagged truncation of them (`truncated: true`, grapheme-boundary cut, ellipsis). No
   other edit — no paraphrase, no cleanup, no translation — is ever permitted. This is
   why a note is deliberately **not** the protocol's `UserFeedbackEntry`, which promises
   verbatim with no truncation; the untruncated source of record is always
   `get_recent_receipts`, and when anything in a block was cut, the `note` MUST say so
   and name the redemption path.
2. **Selection and ordering are structural, never semantic.** A server MUST NOT filter,
   select, or rank notes by inferred topical relevance to what the assistant is
   building — no keyword matching against the goal, no embeddings, no classification.
   Deciding which note is "about" the current topic is inference the server does not
   do, would do badly, and would drop precisely the note whose relevance no keyword
   reveals. Structural criteria are allowed: recency, storage order, size budgets —
   and **candidate-membership ordering**, i.e. sorting notes about the
   content/shows named *in this very call* ahead of the rest, IS structural
   (membership in an id set, not a judgment about meaning) and is allowed.
3. **Honest framing.** The block's `note` MUST state only what the server actually
   computed on this call. If no candidate set existed (a call that named no content),
   the note must not describe a candidate-first ordering that did not happen. If notes
   were dropped, the note must not characterize *what* the missing notes are about —
   the server has not computed that.
4. **`recommended_for` is omitted, never guessed.** When the server cannot attach the
   words to a single goal — direct play, goal-less receipt, or the same words stored
   under two or more different goals with different outcomes — the key is absent, and
   the server states no specific reason it does not have. Attaching a verdict to a
   context the user may never have said it in is worse than attaching no context.
5. **Gated on `receipts:read`.** For a connection without the scope, both envelope keys
   MUST be absent — byte-identical to a response from a server without the capability.
6. **Absent when empty, never null.** A user with nothing written produces no
   `standing_feedback` key at all — never `null`, never an empty block, never `[]`.
7. **`more_on_file` means incomplete — nothing more.** Present iff at least one
   qualifying note was not emitted (row caps, character budgets, unreadable rows,
   unquotable entries). It carries no claim about what the remainder contains, and it
   is a flag, not a count.
8. **`standing_feedback_unchecked` means the server attempted and could not.** It is
   never a statement that nothing exists, and it MUST NOT be raised when no look was
   attempted. The host tool's own payload MUST be unchanged in every failure case —
   history must never cost a caller a verdict.
9. **Delivery cadence is implementation-defined.** How often, and on which of its
   carrier tools, a server serves the block is its own choice (the reference
   implementation always serves it on `create_plan` and rate-limits the read-path
   carriers). Cadence choices never justify violating rules 5–8.
10. **Bounded like everything else.** The published schemas pin the hard ceilings — a
    per-note `text` cap and a maximum note count (§5: the numbers live in the schemas) —
    and a conforming block never exceeds them. *Within* those ceilings, a server's own
    budgets (aggregate character budgets, smaller note counts, per-call spending) are
    implementation-defined; whole notes are dropped (and `more_on_file` set), never
    squeezed beyond the flagged truncation of rule 1.

## 18. `AssistantHandoff` (DRAFT — non-normative)

> **Status (Appendix B):** DRAFT and unimplemented. No server serializes this object.
> The schema stays exported and compiling so the shape survives review, and it may
> change before it ships. Its `position_seconds` concept ("where in the content")
> migrated into `UserFeedbackEntry.location` (§16) in 0.3.

A short-lived context capsule created when the user taps "Ask assistant"
mid-consumption. The user picks which assistant receives it; the payload contains only
explicitly permitted context — never full history.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `cueback_version` | string | yes | Producer's version (top-level document convention, §3). |
| `handoff_id` | string (`hf_…`) | yes | Handoff ID. |
| `content` | object (`content_id`, `title`, `source_title`, `duration_seconds`, `published_at`) | yes | Metadata subset of `ResolvedContent`: what is being consumed. |
| `position_seconds` | integer | yes | Playhead position when the user asked. |
| `recommendation_reason` | string | no | The `why` of the recommendation, when the content came from a plan. |
| `user_question` | string | yes | The user's question, as typed/spoken in the app. |
| `transcript_excerpt` | string | no | A transcript span around the playhead — **only when the publisher supplied a transcript** (V1 policy; never generated). |
| `receipts` | `ConsumptionReceipt[]` | no | Prior receipts, **only those the user explicitly authorized** for this handoff. |
| `expires_at` | string (ISO 8601) | yes | Hard expiry; the server refuses to serve the handoff after this time and purges it. |

```json
{
  "cueback_version": "0.4",
  "handoff_id": "hf_0198c5e6-7f80-7a1b-8c2d-3e4f5a6b7c8d",
  "content": {
    "content_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
    "title": "The Economics of AI Inference",
    "source_title": "Practical AI Infrastructure",
    "duration_seconds": 3540,
    "published_at": "2026-07-14T09:00:00Z"
  },
  "position_seconds": 1930,
  "recommendation_reason": "A practitioner walks through real inference cost curves.",
  "user_question": "Is the margin math he just described still true for coding agents?",
  "transcript_excerpt": "…so the moment your cache hit rate drops, your per-token cost roughly doubles…",
  "expires_at": "2026-07-29T09:15:00Z"
}
```

**Semantics (intended).** The app creates a handoff and receives a one-time token. The
token is conveyed to the assistant the user chose; retrieval is gated by the
`handoffs:read` scope, single-consumption, and the expiry. Handoffs are deleted after
consumption or expiry — they are a message, not a store.

## 19. `AssistantConnection` and `Scope`

The permission envelope. The *semantics* — every MCP session is authenticated as exactly
one connection, every tool call is authorized against that connection's scopes — govern
the whole tool surface. As of 0.4 the `AssistantConnection` *wire document* is normative
as well: the reference implementation serializes it on its connections listing.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `connection_id` | string (`conn_…`) | yes | Connection ID. |
| `assistant_name` | string (slug, `^[a-z0-9_-]{1,32}$`) | yes | Which assistant this connection belongs to. An OPEN slug since 0.3 — `chatgpt` / `claude` / `gemini` / `other` are documented conventions with pretty display names; any other slug is legal and clients SHOULD render it capitalized. |
| `scopes` | `Scope[]` | yes | Granted scopes. |
| `created_at` | string (ISO 8601) | yes | When the user connected this assistant. |

`Scope` enum:

| Scope | Grants |
|---|---|
| `plans:read` | Read plans and per-recommendation consumption state (`get_plan`). |
| `plans:write` | Create and edit plans, import feeds, mint player links (`create_plan`, `update_plan`, `import_feed`, `create_player_link`). |
| `receipts:read` | Read consumption receipts (`get_recent_receipts`), the `already_listened` bit on resolved content, and the `standing_feedback` envelope keys (§17). |
| `feedback:write` | Record user-stated feedback, structured or verbatim (`record_feedback`). |
| `handoffs:read` | Retrieve `AssistantHandoff` payloads by token. |

```json
{
  "connection_id": "conn_01989f00-1a2b-7c3d-8e4f-9a0b1c2d3e4f",
  "assistant_name": "claude",
  "scopes": ["plans:read", "plans:write", "receipts:read", "feedback:write"],
  "created_at": "2026-07-01T10:02:00Z"
}
```

**Semantics.** Connections are per-assistant and independently revocable: the user can
disconnect ChatGPT without touching Claude. Revocation takes effect immediately —
subsequent MCP calls on that connection fail authentication. Cross-assistant portability
is the composition of scopes: a newly connected assistant with `plans:read` +
`receipts:read` can pick up where another left off, without ever seeing the other
assistant's conversation.

## 20. Extensions

Servers MAY attach non-protocol keys to their **tool-result envelopes** — extra keys
beside a tool's specified payload. The rules:

- Tolerant readers (§3) ignore unknown keys, so an extension is safe by construction
  for every conforming consumer.
- An extension MUST NOT change the meaning or shape of any specified field, and MUST
  NOT be required for the tool's specified behavior — a client that ignores it loses
  nothing the spec promises.
- Extension keys live on the envelope, not inside protocol objects: a protocol object's
  field set is this document's to define.
- An extension that proves out **graduates by spec revision**: it is written into this
  document, gains normative semantics, and becomes portable across implementations.
  `standing_feedback` (§17) is the precedent — it shipped as a reference-implementation
  envelope extension, was evaluated, and was promoted in 0.4.

## 21. Privacy boundaries (summary)

The protocol's privacy rules, restated in one place:

1. **Scoped brief, not memory dump.** `Brief` is the only inbound context object. There
   is no user-profile field anywhere in the protocol, and `preferences` must contain
   plan-scoped directives only (§7).
2. **Receipts, not raw logs.** Raw consumption events (`PlaybackEvent` and any future
   profile's equivalent) are app→server only. The assistant-facing behavioral surface is
   `ConsumptionReceipt` — a summary shaped by the §16 caveats — plus the
   `StandingFeedback` block that re-serves stored receipt content (§17); both are gated
   by `receipts:read`.
3. **Verbatim, not inferred.** `user_feedback` is preserved exactly and never classified
   server-side; the server runs no sentiment analysis and builds no taste model (§16).
   `StandingFeedback` selection is structural, never semantic (§17).
4. **Temporary interests expire.** `brief.retention` is enforced server-side: `session`
   briefs are never persisted, `playlist_lifetime` briefs die with their plan (§7).
5. **Per-assistant permissions, independent disconnect.** Every MCP call is bound to one
   `AssistantConnection` with explicit scopes; revoking one assistant never affects
   another (§19).
6. **User veto over curation.** Locked recommendations are untouchable by assistants
   (§13).
7. **Handoffs are minimal and ephemeral.** Only explicitly permitted context, only
   publisher transcripts, hard expiry, single consumption (§18).
8. **No inference in V1.** The server builds no taste profiles and runs no recommendation
   engine; there is nothing hidden to inspect or delete.

## 22. Writing a media profile (normative-lite checklist)

Cueback's media-neutral core is only proven by profiles. A new profile (a "reading
profile" for articles, a video profile, …) is a package beside `@cueback/podcast` plus a
server that implements it. Normative-lite: MUST items are what the core objects assume;
everything else is the profile author's judgment.

A profile MUST define:

1. **Its content variants.** A `ContentRef` variant (what an assistant can hand over,
   with at least one hard identifier and optional hints) and a `ResolvedContent` variant
   (what the server grounds), both discriminated on a new `content_type` value.
   Under §3/§8 tolerance, existing consumers parse the new variants as *unrecognized
   content* and treat them as unsupported — no core release is required for validators
   to survive the addition.
2. **Its size unit** for `ConsumptionReceipt.content_length` — the `{ unit, value }`
   pair's unit string (podcast: `"seconds"`; articles would use `"words"`). One unit per
   profile, documented, stable, within the machine-ish bound (§5).
3. **Its location unit** for `UserFeedbackEntry.location` — usually the same unit as the
   size ("the note is about second 1980" / "about word 3200").
4. **Its raw event vocabulary** — the profile's `PlaybackEvent` equivalent: a typed
   event object with a closed `type` enum, a RECOMMENDED client-minted `event_id`, and
   `occurred_at`. Events are app→server only and never reach assistants (§14, §21);
   publish the object, keep the transport an implementation note.
5. **Its search result shape** — what the profile's library-lookup tool returns per row
   (the podcast profile's `EpisodeSearchResult`), including the `match_basis`
   disclosure where matching can be transcript/derived-text based.

A profile SHOULD also state: how `consumption.progress_percent` and
`time_spent_minutes` are derived from its events (the receipt builder's math is
per-profile), what its `outcome` thresholds mean, and which `UnavailableReason` values
its resolver can emit. A second *implemented* profile is the 1.0 gate (§3).

---

## Appendix A — Implementation notes: the reference player (NON-NORMATIVE)

Everything in this appendix is how **Rovyn** (the reference implementation) wires its
own app to its own server. It is documented for self-hosters and implementers, and
published honestly — but it is NOT part of the Cueback protocol (§1 boundary): another
implementation may transport events, claim links, and deliver audio however it likes.
The app and server deploy together, so this surface is version-locked rather than
version-tolerant.

- **Playback-event transport.** The app batches `PlaybackEvent`s (§14) through a
  durable on-disk outbox and uploads them to a REST endpoint with a bearer
  device-session token. The batch envelope the server accepts is a **bare JSON
  array** of events — no wrapper object — capped at 500 events; the reply is
  `{ "accepted": <n> }`. A batch with any invalid event is rejected whole (400) so the
  retry queue never reasons about partial acceptance.
- **Event idempotency.** The outbox stamps each event with a client-minted UUID
  `event_id` at enqueue time and re-sends the same ids on retry; the server's insert
  ignores duplicates on that key, so a batch whose 2xx was lost in transit cannot
  double-count. `accepted` reports the batch size even when some events were already
  stored — the outbox only needs permission to clear its queue.
- **Device auth.** The app registers a device against a verified sign-in and receives a
  bearer session token (stored hashed server-side). All player REST calls carry it.
- **Link claiming.** `create_plan` / `create_player_link` mint universal links
  (`https://…/l/<token>`). Opening one in the app claims the plan for that device;
  claiming is one-shot per token and never mutates identity — the claiming device's
  account must own the plan.
- **Audio delivery.** The app streams directly from publisher enclosure URLs; the
  server never proxies audio. Episode detail is network-first with a client-side
  write-through cache so cached editions still arm offline.
- **Plan payload trimming.** Plan-shaped responses truncate each recommendation's
  `description` to ~500 characters (with an ellipsis); the full description lives on
  the episode-detail route. Implementation choice, not protocol: `description` is
  optional and its protocol bound (§5) is far above this display trim.

## Appendix B — Draft objects (NON-NORMATIVE)

One object ships in `@cueback/core` as a **draft**: exported and compiling, documented,
but unimplemented and subject to change until it ships.

- **`AssistantHandoff`** (§18) — the "Ask assistant" capsule. No payload is ever built.
  Its `position_seconds` concept survives in `UserFeedbackEntry.location` (§16).

Treat it as a preview of intent, not a contract. (`AssistantConnection`, formerly the
other draft, became a normative wire document — §19.)
