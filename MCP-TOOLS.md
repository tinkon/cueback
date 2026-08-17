# Cueback MCP Tools — v0.4

Status: living. This document is **self-contained**: together with
[SPEC.md](./SPEC.md) (the canonical object specification) it fully specifies the
assistant-facing tool surface — nothing normative lives outside these two files.
Direction and layering: [DIRECTION.md](./DIRECTION.md). The examples
below show the Rovyn server, the reference implementation.

One vocabulary note before anything else: where this document says **"edition"** or
**"shelf"**, that is Rovyn's display vocabulary — what its screens and its tool
instruction strings call the protocol's `ConsumptionPlan` and the list the user keeps
them on. The wire names are the protocol's own (`plan_id`, `recommendations`); the
warm words are the product's, and nothing about them is normative.

MCP is the assistant-facing connection: it defines *how* assistants call the service;
Cueback defines *what* the objects mean. Eleven tools on the Rovyn server: the eight
core-loop tools plus three catalog-ergonomics extensions (`resolve_content_batch`,
`import_feed`, `list_shows` — the tool list is explicitly non-exhaustive).

**Layering.** Seven tools are media-neutral Cueback conventions — `resolve_content`,
`resolve_content_batch`, `create_plan`, `update_plan`, `get_plan`, `get_recent_receipts`,
`record_feedback`. Three are podcast-profile tools — `search_episodes`, `import_feed`,
`list_shows`. One is an app tool — `create_player_link`. A second media profile would add
its own profile tools and reuse every neutral one unchanged.

## Division of labor — read this before the tool list

**The assistant is the discovery engine. Cueback is the grounding layer.**
(Locked 2026-07-31, after field feedback from a real Claude Desktop session.)

The assistant already has the better discovery engine: web search, current events, and
the conversation itself. This server does not compete with it and will never ship
semantic/embedding search. What it has that the web does not:

- **Grounding.** A URL or a title becomes *consumable* content — or a machine-readable
  reason it cannot be (`subscription_only`, `spotify_exclusive`, `apple_subscription`,
  `private_feed_required`, `removed_by_publisher`, `no_public_feed`, `audio_unreachable`,
  `unsupported_content_type`, `resolution_failed`). Only the server can declare content
  playable (spec §1).
- **The user's library and consumption state.** What they subscribe to, what they already
  heard, what they said about it.
- **Receipts.** How the last recommendation actually landed — including the user's own
  words.

The typical loop:

1. The assistant web-searches for candidates. *(No tool call.)*
2. `resolve_content_batch` — up to 25 refs in ONE call — or `import_feed` when what was
   found is a whole *show* rather than specific episodes.
3. `list_shows` / `search_episodes` to see what the library already holds and what the
   user already heard.
4. `create_plan` — whose `recommendations` accept raw refs, not just catalog ids, and
   batch-resolve them with per-item reasons in `unresolved`.
5. Hand the `player_link` to the user; later, `get_recent_receipts`.

`search_episodes` is a **library lookup**, not topic discovery. Empty results mean the
library lacks the episode — never that it does not exist. A server SHOULD also ship this
division of labor as its server-level MCP `instructions`, so it reaches the model
alongside the tool list; keep the two in sync.

## Transport and authentication context

- **Transport:** MCP over **Streamable HTTP**, mounted at **`/mcp`** on the Rovyn
  server. MCP server name: `rovyn`.
- **One session = one connection.** Every MCP session is authenticated as exactly one
  `AssistantConnection` (bearer token; the server stores only a hash of it). All tool
  calls in the session act as that connection's user and are authorized against that
  connection's `scopes`.
- **Connections are per-assistant and revocable.** The user grants each assistant its own
  connection with its own scopes, and can revoke it from the app at any time; revocation
  takes effect immediately — every subsequent call on that session fails authentication.
  Revoking one assistant never affects another.
- **Scope enforcement is per tool** (table below). A call without the required scope fails
  with error code `forbidden_scope`; it never partially succeeds.
- **How a connection is obtained** (Rovyn implementation detail): an OAuth 2.1
  authorization server on the same origin — RFC 8414 / RFC 9728 discovery documents,
  PKCE S256 required, DCR (RFC 7591) + client-ID-metadata-document registration,
  and a rotating refresh token with every grant (`offline_access` is advertised but is
  not a gate), so a connection lasts until it is revoked. An unauthenticated `POST /mcp`
  answers `401` with `WWW-Authenticate: Bearer resource_metadata="…"` so MCP clients
  bootstrap the flow. (Dev-mode pairing tokens remain a parallel, non-expiring door for
  local development.)
- **Tool metadata.** Every tool ships a human `title` and MCP `ToolAnnotations` with
  explicit `readOnlyHint`/`destructiveHint` (read/write split is clean; `update_plan`
  is the one destructive-capable tool), plus `_meta.securitySchemes` naming its
  required OAuth scopes.

| Tool | Required scope |
|---|---|
| `search_episodes` | none (any authenticated connection) |
| `resolve_content` | none (any authenticated connection)¹ |
| `resolve_content_batch` | none (any authenticated connection)¹ |
| `list_shows` | none (any authenticated connection) |
| `import_feed` | `plans:write`² |
| `create_plan` | `plans:write` |
| `update_plan` | `plans:write` |
| `get_plan` | `plans:read` |
| `get_recent_receipts` | `receipts:read` |
| `record_feedback` | `feedback:write` |
| `create_player_link` | `plans:write` |

¹ Catalog data is not user data. The user-derived parts are additionally gated:
`ResolvedContent.already_listened` is reported `false` without `receipts:read`, and the
`standing_feedback` block (§ The standing corpus; spec §17) is **absent entirely** — not
empty — without it. Note that this makes `receipts:read` a broader grant than it reads:
it no longer only answers `get_recent_receipts` when asked, it pushes the user's written
notes onto five tools an assistant calls for other reasons. The four read carriers
still publish `_meta.securitySchemes` `scopes: []`, because that field means *required to
invoke* — they must work without `receipts:read`, returning no feedback keys at all — and
MCP has no way to express *used if held*. Read an empty list as "any connection may call
this", never as "this returns no user data".

² Unlike the other two extensions, `import_feed` **mutates**: it writes shows/episodes
into the catalog and records a durable follow for the connection's user, so it needs a
write-capable connection.

(The fifth scope, `handoffs:read`, gates retrieval of `AssistantHandoff` payloads by
token — a flow initiated from the app, not one of the assistant tools above.)

## The standing corpus — `standing_feedback`

*(Protocol object since 0.4 — spec §17 defines the shapes and the normative semantics;
the capability is OPTIONAL for a Cueback server. This section documents how the
reference implementation delivers it: its carrier tools, cadence, and ceilings are
implementation choices made within the spec's rules.)*

Five tools carry it — `resolve_content`, `resolve_content_batch`, `search_episodes`,
`list_shows`, `create_plan` — each returning up to two extra **envelope** keys beside its
own payload. They are **additive**: an older client that does not know them ignores them,
and nothing inside `ResolvedContent` / `EpisodeSearchResult` / `Recommendation` changes.

**What it is.** Everything this user has actually **written** about their listening that
fits — and **not filtered to the assistant's topic**. The server refuses to decide which
note is "about leadership": that is inference it does not do, it would do it badly ("help
me with my skip-level" shares no keyword with "leadership"), and it would drop precisely
the note that mattered. Typed notes are rare enough (~70 a year for a daily listener) that
the corpus can simply be handed over. Wordless verdict-only receipts are excluded —
`already_listened`, which still rides every resolve verdict, covers those.

**The one concession to relevance is an ordering, and it is made of ids.** Notes about the
shows named *on this very call* sort first — the remaining tiebreaks are storage order, not
anything the block claims — and the ordering is applied *before* the row limit, so the
limit keeps the notes that will actually be emitted. Three calls name
no shows at all — `list_shows` always, `search_episodes` with zero results, and
`resolve_content`'s `unsupported_content_type` path. On those calls the block emits **no
ordering sentence at all** — not a description of the fallback order — because that order is
`created_at`, which is receipt REBUILD time rather than when anyone wrote anything. A reader
told the head of the list is the shows-under-consideration tier when it is not has been told
something false; a reader told nothing reads the dates on the notes, which are true.

**A note carries the context that stops a bare quote from misleading**: the episode title,
the show title, when it was said, the deterministic `consumption` block, and **the goal the
edition was built under** (`recommended_for` — "too basic" under *intro to rates* and under
*advanced macro* are opposite instructions) *when that goal is knowable*.

**`recommended_for` is omitted rather than guessed, and the server states no reason it does
not have (2026-08-08).** A note arrives without a goal for one of **three** reasons, and the
server does not know which: the episode was **played straight**, with no plan scope, so the
receipt never carried the key; the recommendation stated no `goal_supported` and the brief's
`goal` was empty (never set, or scrubbed by its retention policy), so the builder omitted
it; or the episode's **scopes disagree**. The `note` names none of them — it says only
that the server has no single goal it can attach those words to, and tells the reader not
to infer why the goal is absent (spec §17 rule 4: the server states no specific reason it
does not have). (It used to assert the third cause for all of them, which told a model an
episode had been heard several times when the data says no such thing.) The third case in full: the user's words are
stored per EPISODE; the goal and the `consumption` numbers are stored per PLAN SCOPE. An
episode recommended twice therefore holds two receipt rows carrying the *same* sentence
under *different* goals with *different* outcomes, and picking one of them would attach the
user's verdict to a context they may never have said it in. So the server detects the
disagreement and, when the scopes disagree, drops `recommended_for`. `consumption` is
copied — field by field, exactly as stored — from the receipt being shown and never
mixed across receipts; that is exactly what is guaranteed, and the note says it too. The
same words about *different* episodes stay two statements, each with its own context.

**Delivery: `create_plan` always carries it** — that is the build. The four read carriers
carry it at most once per **20 minutes** per connection. (Not six hours: a window long
enough to be spent by an unrelated conversation could starve the build path, which is the
one path that must never be starved.)

```jsonc
{
  "results": [ /* … the tool's own payload, unchanged … */ ],
  "standing_feedback": {
    "note": "What this user has WRITTEN about their listening — … This is not all of it: more_on_file marks …",
    "notes": [
      {
        "text": "The scripts for opening a skip-level conversation are the part I'll actually use — more episodes this concrete.",
        "said_at": "2026-06-11T09:02:44.000Z",
        "content_id": "ep_…",
        "content_title": "How to build trust with your skip-level",
        "source_title": "Coaching for Leaders",
        "recommended_for": "Get better at skip-level relationships",
        "consumption": { "outcome": "completed", "progress_percent": 100, "time_spent_minutes": 41 }
      },
      {
        "text": "too basic",
        "said_at": "2026-07-01T09:00:00.000Z",
        "content_id": "ep_…",
        "content_title": "Term premium decomposition",
        "source_title": "Rates and Macro",
        // no recommended_for: the server has no single goal to attach these
        // words to — played straight, or no goal on the receipt, or heard under
        // more than one goal. It does not report which, and does not guess.
        "consumption": { "outcome": "skipped", "progress_percent": 4, "time_spent_minutes": 2 }
      }
    ],
    "more_on_file": true
  }
}
```

Every field is **copied** from one stored `ConsumptionReceipt`, never re-derived, and
`consumption` is restated exactly as stored — **projected field by field** (`outcome`,
`progress_percent`, `time_spent_minutes`), never passed through wholesale, so a field
this server does not name cannot ride out unread and uncharged. `structured_feedback` and
`UserFeedbackEntry.location` are deliberately **not** carried: the note quotes the words
and the deterministic block, nothing more — `get_recent_receipts` still returns both
whole, and remains the untruncated source of record.

**Caps** (this implementation's ceilings, within spec §17 rule 10 — whole notes are
dropped, never squeezed harder): 40 notes, **500 characters per verbatim text**, 120 per
copied title, 200 per copied `recommended_for`, and two whole-call ceilings — **8000
verbatim characters** and **16000 copied characters** (verbatim plus every title,
`recommended_for`, `said_at`, `content_id` and `consumption.outcome` echoed — the
complete list of strings copied out of storage, every one of them charged, and closed
because a note is projected from named fields rather than passed through wholesale from
storage, so the payload is bounded in bytes and not merely in rows).

**Nothing is dropped silently — but the remainder is a flag, not a count.**
`more_on_file: true` (or absent) is set by every path that loses a note: the probe row, the
40-note cap, a budget refusal, a stored row that claims words and cannot be read, a
`user_feedback` that is present but is not a list, and an entry that cannot be quoted — no
text, or no `occurred_at` (required on the wire, and the context that stops a bare quote
misleading, so an undated entry is dropped and declared rather than shipped undated). An
exact total would force the server to visit every matching note before the row limit
could apply; instead it looks exactly one note past what it emits.

**The `note` tells the truth about the fragment's shape.** Past 40 notes what you hold is
the front of the list and what is missing is the older tail of the same order — *which may
be about shows you did not name, or may be more notes about the ones you did*. The note
claims neither, because the server does not compute which; it used to say the missing notes
were about shows you did not name, and that is false exactly when a user has written more
than 40 notes about the one show being weighed today. The ordering half is conditional the
same way: on a call that named no shows the note says so instead of describing a tiering
that did not happen. It also states
exactly how far the escape hatch reaches: `get_recent_receipts` is newest-first, at most 100
receipts, filtered only by `since`, `plan_id` or `content_id`; it cannot search text, cannot
filter to receipts carrying notes, and cannot page past its own newest 100. It redeems a
named receipt, not an old tail — and the note claims nothing more.

**Truncation is the one edit made to the user's words.** A text over 500 characters is cut
on a grapheme boundary — never mid-emoji, never leaving a word fragment — gains an ellipsis,
and carries `truncated: true`. That is why a note here is deliberately **not** the
protocol's `UserFeedbackEntry`, which promises verbatim. Titles (120) and `recommended_for`
(200) are cut the same way but carry no per-field flag, so **whenever anything in a block was
cut the block's `note` says so** and names `get_recent_receipts` with a `content_id` — the
untruncated source of record, which takes that filter precisely so a cut can be redeemed for
*that* receipt rather than hoping it is inside the newest hundred.

**Absence never means two things.** `standing_feedback_unchecked: true` means the server
*could not look* — the call's latency budget was nearly spent, the lookup threw or ran past
its 1.5s bound, or every stored row that claimed words was unreadable. It is raised only
when a look was actually attempted: the twenty-minute window not being due is not a failure
to report. The host tool's own payload is unchanged in every failure case — history must
never cost a caller a verdict. A connection **without `receipts:read` sees neither key at
all**, which is byte-identical to the responses this server returned before the feature
existed.

## Error convention

Expected domain outcomes are **successful** results, not errors — most importantly,
unresolvable content returns `status: "unavailable"` with an `UnavailableReason`. Actual
failures are returned as MCP tool errors (`isError: true`) whose text content is a JSON
error body:

```json
{ "error": { "code": "locked_recommendation", "message": "Recommendation rec_… is locked by the user." } }
```

Codes used below: `validation_failed`, `forbidden_scope`, `not_found`, `locked_recommendation`,
`op_not_allowed`, `content_unavailable`, `no_playable_content`, `show_not_found`,
`feed_unreachable`. Lookups scoped to another user's data return `not_found`, never
`forbidden_scope` (no existence leaks).

These are **wire** codes: whatever error vocabulary a server keeps internally is
translated to them at the MCP boundary, so one class of caller mistake never arrives
under two names depending on the tool.

**How `validation_failed` is delivered.** Input rules the published JSON Schema can
express (missing `query`, an empty or over-long `refs` array, a `limit` out of range, a
podcast `ref` carrying none of the four identifiers) are enforced by the MCP SDK *before*
any handler runs. Those still come back as `isError: true`, but their text is the SDK's
own `Invalid arguments for tool <name>: …` message quoting the failing rule — not the
JSON envelope above. Rules the schema cannot express (`import_feed`'s exactly-one
identifier, `create_plan`'s podcast-only V1 guard) are checked in the handler and do
return the `validation_failed` envelope. Either way the message names what to fix; the
`validation_failed` bullets below identify the *rule*, not the frame it arrives in. Parse
the text defensively.

Examples below show the tool-call `arguments` object ("Request") and the structured tool
result ("Response"), omitting the JSON-RPC envelope.

---

## 1. `search_episodes` *(podcast profile)*

**Purpose.** Look inside the **user's library** — the shows already imported, the episodes
resolved for them plus those shows' recent siblings, and their private feeds. Full-text
search over metadata (episode title, show title, description/show notes,
categories; publisher transcript text when indexing lands — in V1 transcripts are **not**
searched, so `match_basis` always reads `"metadata"`).

A show that arrived by **resolution** rather than by `import_feed` is present but not
complete: resolving an episode writes that episode plus the feed's 50 most recent items,
not the whole back catalog (just-in-time ingest is capped). If a search
comes up short on a show you know is deep, `import_feed` on its `feed_url` completes it
and the search is worth repeating.

**This is a library lookup, not topic discovery.** It has no semantic understanding and no
view of the open podcast universe. An assistant looking for "what's good on inference
economics this month" should web-search and bring the findings to
`resolve_content_batch`; `search_episodes` answers the question the web cannot: *what does
this user already have?* Empty results are a fact about the library, never about
podcasting. (Consumption state rides along: `already_listened` arrives on resolve
verdicts, and `standing_feedback` carries the user's own written notes, the ones about
these shows sorted first.)

**Two-rung match ladder.** Field feedback that motivated it: the original search ANDed
its terms, so multi-concept queries ("inference economics coding agents") returned `[]`
and every added word made a hit *less* likely — a well-specified query performed worse
than a vague one. Now:

1. **All terms.** Every term must match the same episode, ranked by relevance (episode
   title weighs most, then show title and categories, then description) then recency
   → `matched: "all_terms"`.
2. **Any term.** Only when rung 1 returns zero rows: the same terms re-expressed as "any
   of these", ranked by length-normalized relevance so the episode matching the most
   (and most prominent) terms comes first → `matched: "any_terms"`.
3. Nothing matched even one term → `{ "results": [], "matched": "none" }`.

The degradation is **disclosed, not hidden**: `matched` lets the assistant present an
`all_terms` hit confidently, skim an `any_terms` hit before recommending it, and treat
`none` as "go web-search, then `resolve_content_batch` / `import_feed`". Filters and
`limit` apply identically to both rungs. Query style: 2–4 distinctive keywords beat a
sentence.

**Scope:** none (any authenticated connection).

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `query` | string | yes | Keywords (not a sentence). Matched against library metadata. |
| `max_duration_minutes` | integer | no | Only return episodes at or under this length (for fitting consumption windows). |
| `published_after` | string (ISO 8601) | no | Only return episodes published after this instant (recency filter). |
| `show_title` | string | no | Restrict to shows whose title matches. |
| `limit` | integer | no | Max results; default 10, max 50. |

**Output**

| Field | Type | Meaning |
|---|---|---|
| `results` | `EpisodeSearchResult[]` | Ranked matches; may be empty. |
| `matched` | `"all_terms"` \| `"any_terms"` \| `"none"` | Which rung produced `results` (see above). Always present. |

`EpisodeSearchResult` (`@cueback/podcast`):

| Field | Type | Meaning |
|---|---|---|
| `episode_id` | string (`ep_…`) | Catalog ID — pass as `NewRecommendation.content_id` or as `ContentRef.episode_id`. |
| `title` | string | Episode title. |
| `show_title` | string | Show title. |
| `duration_seconds` | integer | Validated duration. |
| `published_at` | string (ISO 8601) | Publication time. |
| `description_snippet` | string | Short excerpt of the description around the match. |
| `has_publisher_transcript` | boolean | Publisher transcript available (V1 never generates transcripts). |
| `match_basis` | `"metadata"` \| `"publisher_transcript"` | Required disclosure: what the match was based on. |

**Example**

Request:

```json
{
  "query": "AI inference economics",
  "max_duration_minutes": 60,
  "published_after": "2026-05-01T00:00:00Z",
  "limit": 5
}
```

Response:

```json
{
  "results": [
    {
      "episode_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
      "title": "The Economics of AI Inference",
      "show_title": "Practical AI Infrastructure",
      "duration_seconds": 3540,
      "published_at": "2026-07-14T09:00:00Z",
      "description_snippet": "…why inference margins, not training runs, decide who wins…",
      "has_publisher_transcript": true,
      "match_basis": "publisher_transcript"
    },
    {
      "episode_id": "ep_0198a7e3-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
      "title": "Betting the Company on GPUs",
      "show_title": "Founders in the Loop",
      "duration_seconds": 2760,
      "published_at": "2026-06-30T05:00:00Z",
      "description_snippet": "…what it actually costs to serve a coding agent at scale…",
      "has_publisher_transcript": false,
      "match_basis": "metadata"
    }
  ],
  "matched": "all_terms"
}
```

**Errors / edge cases**

- No matches → success with `{ "results": [], "matched": "none" }` (never an error).
- `validation_failed` when `query` is missing/empty, `limit` is non-positive, or
  `published_after` is not a bindable ISO 8601 instant.
- Results are library-only: content the assistant found on the web may legitimately be
  absent here — `resolve_content_batch` imports the referenced episode (plus that feed's
  50 most recent items) just in time, `import_feed` imports the whole show.
- `matched: "any_terms"` means the tight query found nothing and these rows matched only
  *some* terms. Check them against the user's actual ask before recommending; do not
  present them with the same confidence as `all_terms`.
- Every result carries `match_basis`; assistants must surface this disclosure when
  presenting recommendations (V1 transcript policy).
- Don't know what the library holds? `list_shows` answers that in one call — cheaper and
  more honest than probing with speculative searches.

---

## 2. `resolve_content`

**Purpose.** Turn **one** assistant-side `ContentRef` (URL, guid, catalog id, or hints)
into a grounded verdict. This is the enforcement point of the core invariant: discovery is
open-ended, consumption is catalog-grounded. For a podcast ref it runs the just-in-time
import pipeline: existing catalog → Podcast Index lookup → canonical publisher RSS feed →
episode match → enclosure/audio check → import into catalog.

**What gets imported is scoped to what you asked for.** This tool makes *one episode*
playable, so it writes that episode — always, however old it is — plus the feed's **50
most recent** items, so "what else has this show put out lately?" needs no second fetch.
It does **not** pull the show's entire back catalog: that is `import_feed`'s job, and it
is the call in which the user asked for the SHOW — just-in-time ingest is capped. Resolving does not make a show fully searchable; importing it does.

The enclosure/audio step is **advisory**: it can only rule an episode out on a definitive
failure (no enclosure, HTTP 404/410, a non-audio body). A probe that timed out or was
refused does not produce `audio_unreachable` — audio checked now is stale by the time the
user presses play, so the player, not the resolver, is the ground truth for transport
failure. The call is also **time-boxed** (25s): if the budget expires before the network
answers, the verdict is `resolution_failed`, never a guess dressed as a fact.

**Have more than one candidate? Use
[`resolve_content_batch`](#9-resolve_content_batch)** — it takes up to 25 refs in a single
call and is the normal path after a web search. This tool is the single-candidate
convenience form; the pipeline behind both is identical. Found a whole *show* rather than
specific episodes? Use [`import_feed`](#10-import_feed-podcast-profile).

**Scope:** none (any authenticated connection). `already_listened` in the result is
reported as `false` unless the connection holds `receipts:read`.

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `ref` | `ContentRef` | yes | Discriminated on `content_type`. For `podcast_episode`: at least one of `episode_id`, `guid`, `feed_url`, `episode_url`; hint fields (`title`, `show_title`, `published_at`) improve matching. See spec §8. |

**Output** — a `ResolutionResult` (spec §10):

| Field | Type | Meaning |
|---|---|---|
| `status` | `"playable"` \| `"unavailable"` | The verdict. |
| `content` | `ResolvedContent` | Present iff `status` is `"playable"`. |
| `reason` | `UnavailableReason` | Present iff `status` is `"unavailable"`: `subscription_only` \| `private_feed_required` \| `spotify_exclusive` \| `apple_subscription` \| `removed_by_publisher` \| `no_public_feed` \| `audio_unreachable` \| `unsupported_content_type` \| `resolution_failed`. `resolution_failed` (0.3) means the RESOLVER failed — fetch error, parse error, ambiguity, or the 25s call budget expiring before the network answered — so a retry or a better ref may succeed; `no_public_feed` is the verified world-fact that no public feed exists; `audio_unreachable` is reserved for a *definitive* audio failure (no enclosure, 404/410, non-audio body). Treat unknown future values as generic unavailability (spec §3). |

**Example**

Request:

```json
{
  "ref": {
    "content_type": "podcast_episode",
    "episode_url": "https://practicalai.example.com/episodes/economics-of-ai-inference",
    "title": "The Economics of AI Inference",
    "show_title": "Practical AI Infrastructure"
  }
}
```

Response:

```json
{
  "status": "playable",
  "content": {
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
}
```

Unavailable response (success, not an error):

```json
{ "status": "unavailable", "reason": "spotify_exclusive" }
```

**Errors / edge cases**

- **Unavailability is not an error.** All "can't consume this" outcomes return
  `status: "unavailable"` with a reason so the assistant can suggest a replacement or
  present the item as an external link.
- **Article refs always come back `unavailable` / `unsupported_content_type`.** The
  article profile is schema-only in V1 (spec §8) — this is the honest verdict, not a bug,
  and not an error result.
- `validation_failed` when a podcast ref carries none of the four identifiers (hints alone
  are not a valid ref).
- A successful resolve may permanently import the show/episode into the catalog; a later
  `search_episodes` will then find it.
- **A directory outage reports `resolution_failed`, not `no_public_feed`.** The directory
  is what makes "no public feed exists anywhere" a checkable claim, so when the lookup
  itself fails the server says so and you should retry — rather than telling the user a
  show is Apple-subscription-only on the strength of a lookup that never happened.
- Treat unknown future `reason` values as generic unavailability (spec §3).

---

## 3. `create_plan`

**Purpose.** Create a `ConsumptionPlan` from a `Brief` and a list of annotated content
references. The server resolves every recommendation, grounds the playable ones, persists
the plan, and mints a player link the user can tap to claim it in the app.

**`recommendations` accept raw refs, not just catalog ids.** This is the single most
under-advertised fact about the tool (field feedback: an assistant resolved episodes one
at a time first, believing ids were required). Each entry is *either*
`{ content_id, why }` *or* `{ ref: { content_type, episode_url | feed_url | guid, title?,
show_title?, published_at? }, why }`. Refs are batch-resolved through the same
just-in-time pipeline as `resolve_content_batch` — including its scope: each ref imports
its own episode plus that feed's 50 most recent items, not the whole show. So **web
search → plan in one call** is a supported path. Use `resolve_content_batch` first when you want to *see* the verdicts
before committing to an ordering, or when a partial failure would change which picks you
make.

**What the user reads.** `title`, `brief.goal`, and every `why` are display copy, not log
lines (spec §7, §11):

- `title` names the plan — clients put it in chrome and in running sentences ("Chosen by
  Claude for *{title}*", "Add to {title}"). A short, specific noun phrase, aim ≤ ~40
  chars.
- `brief.goal` is the **headline** — clients typically set it large and clamp it to a
  line or two. Write ONE scannable line (aim ≤ ~60 chars). What the plan covers, why,
  and any constraints go in `brief.preferences` or the relevant recommendation's `why` —
  a `goal` written as a paragraph truncates mid-sentence.
- Near-duplicate `title` and `goal` are fine; the identical string in both is not — a
  client may render both at once, stacked.

Since 0.4 both fields carry a length bound, but it is a **transport ceiling** in the
editorial class (spec §5), set far above any sensible headline. The one-line guidance is
style you are expected to follow, not the limit the server enforces.

The user may **rename** the edition afterwards (`user_title`, spec §11). That name wins
on every screen, but it never touches the `title` or `brief.goal` you wrote — you read both
back exactly as sent, plus whatever they now call it (`get_plan`, §5).

**An edition usually draws from more than one show.** Different voices on the same question
is most of what a curated edition is *for*, and the server has no say in it: nothing here
narrows your corpus, and `search_episodes` is a library lookup that was never in this
decision's path (breadth is a nudge, never a restriction). Single-show is the
right call in two cases — the goal names a show or series, or the user asked for a course
from one voice — and a poor default otherwise. When every playable recommendation in a call
comes from one show (and there are at least two), the response carries a one-line `note`
saying so. It is an observation, never an error: the plan is created exactly as you sent it.
Widen the next edition, or tell the user why this one is deliberately one series.

**Scope:** `plans:write`.

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `title` | string | yes | The edition's short **name** — app chrome and running sentences ("Chosen by Claude for *{title}*"). Aim ≤ ~40 chars. See "What the user reads" below. |
| `brief` | `Brief` | yes | The scoped brief (spec §7). Its `goal` is the **headline the app displays** — one scannable line, aim ≤ ~60 chars. Its `retention` governs how long the server keeps it. `available_minutes` is **advisory** — see below. |
| `recommendations` | `NewRecommendation[]` | yes, non-empty | Ordered picks; each carries `content_id` **or** `ref` (raw web finding), plus `why` (required), `goal_supported?`, `contrasting_perspective?` (spec §12). |

**Output**

| Field | Type | Meaning |
|---|---|---|
| `plan_id` | string (`pl_…`) | The created plan. |
| `player_link` | string (URL) | Universal link that opens/claims the plan in the app. |
| `recommendations` | `Recommendation[]` | The ones that resolved playable, in position order — each grounded with `ResolvedContent`. |
| `total_duration_seconds` | integer | Sum of `duration_seconds` over the playable recommendations. Since 0.3 also an optional protocol `ConsumptionPlan` field the server populates on every plan it returns (spec §11). |
| `unresolved` | `{ input_index: integer, ref: ContentRef, reason: UnavailableReason }[]` | Per-item resolution failures, keyed to the input array; empty when everything resolved. |
| `note` | string, optional | One line about the edition that was just built — present **only** when every playable recommendation came from a single show (2+ recommendations). An observation to act on or explain, never an error; absent otherwise. |

**Example**

Request:

```json
{
  "title": "AI coding-agent economics — this week",
  "brief": {
    "goal": "Understand the economics of AI coding agents",
    "available_minutes": 120,
    "knowledge_level": "intermediate",
    "preferences": [
      "prefer practitioners",
      "avoid beginner AI explanations",
      "include one skeptical perspective"
    ],
    "retention": "playlist_lifetime"
  },
  "recommendations": [
    {
      "content_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
      "why": "A practitioner walks through real inference cost curves — directly addresses the margin question.",
      "goal_supported": "Understand unit economics of serving coding agents"
    },
    {
      "ref": { "content_type": "podcast_episode", "episode_url": "https://gpuskeptic.example.com/ep/42", "title": "The Coming Agent Margin Collapse" },
      "why": "The skeptical perspective you asked for: argues agent margins collapse at scale.",
      "contrasting_perspective": true
    }
  ]
}
```

Response:

```json
{
  "plan_id": "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b",
  "player_link": "https://rovyn.app/l/8f3kQ2mVx1",
  "recommendations": [
    {
      "recommendation_id": "rec_0198a9c1-4f5a-7b6c-8d7e-9f0a1b2c3d4e",
      "content": {
        "content_type": "podcast_episode",
        "episode_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
        "show_id": "show_0198a7e0-4c1d-7a2b-8f3e-2b9d4c5e6f70",
        "title": "The Economics of AI Inference",
        "show_title": "Practical AI Infrastructure",
        "duration_seconds": 3540,
        "published_at": "2026-07-14T09:00:00Z",
        "has_publisher_transcript": true,
        "already_listened": false
      },
      "position": 0,
      "why": "A practitioner walks through real inference cost curves — directly addresses the margin question.",
      "goal_supported": "Understand unit economics of serving coding agents",
      "match_basis": "publisher_transcript",
      "contrasting_perspective": false,
      "locked": false,
      "added_by": "assistant"
    }
  ],
  "total_duration_seconds": 3540,
  "unresolved": [
    {
      "input_index": 1,
      "ref": { "content_type": "podcast_episode", "episode_url": "https://gpuskeptic.example.com/ep/42", "title": "The Coming Agent Margin Collapse" },
      "reason": "no_public_feed"
    }
  ]
}
```

**Errors / edge cases**

- `forbidden_scope` without `plans:write`.
- Per-item resolution failure does **not** fail the call: playable recommendations form
  the plan; failures are reported in `unresolved` so the assistant can substitute or
  present external links, then `update_plan` with replacements.
- `no_playable_content` (error) when *zero* recommendations resolve playable — nothing is
  created.
- `validation_failed` for an empty `recommendations` array, an entry with neither
  `content_id` nor `ref`, or a missing `why`.
- **V1 podcast guard:** a recommendation whose ref is not `content_type:
  "podcast_episode"` is rejected outright (house code `invalid_request`, delivered as
  `validation_failed`) rather than silently dropped into `unresolved`. Resolve an article
  ref with `resolve_content` if you want the explicit `unsupported_content_type` verdict.
- `match_basis` on each created recommendation is server-assigned from how the content was
  matched — assistants do not set it.
- **`brief.available_minutes` is advisory.** The server never truncates or reorders the
  list to fit it; the assistant is the editor. Compare it against
  `total_duration_seconds` in the response and decide — trim, or tell the user this plan
  runs long.
- Never drop an unavailable pick silently. `unresolved` carries a reason precisely so the
  user can be told "that one is Spotify-exclusive" rather than watching a recommendation
  vanish.
- **`note` is never an error and never changes the plan.** It appears when the finished
  edition is single-show, reads e.g. *"All 4 recommendations come from one show (\"Signals
  &amp; Skeptics\")…"*, and is absent whenever the picks span two or more shows — or when
  there is only one pick, where the observation would be vacuous. Nothing about a
  single-show plan is rejected, reordered, or trimmed.
- **The call is time-boxed to 25s.** Picks still needing the network when the budget
  expires land in `unresolved` with `resolution_failed` — the plan is still created from
  what did resolve. Add them back with `update_plan`, or pre-ground a long list with
  `resolve_content_batch` first and pass `content_id`s (those never touch the network).
- If `brief.retention` is `"session"`, the server uses the brief for this creation and
  does not persist it (spec §7).

---

## 4. `update_plan`

**Purpose.** Apply an atomic batch of `PlanUpdateOp`s to a plan (add / remove / reorder /
replace). This is the assistant's edit path; user edits go through the app's own edit
surface. Assistant edits must never touch user-locked recommendations.

**Scope:** `plans:write`.

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `plan_id` | string (`pl_…`) | yes | Target plan (must belong to the connection's user). |
| `ops` | `PlanUpdateOp[]` | yes, non-empty | Applied in order, atomically. Variants: `{op:"add", recommendation: NewRecommendation, position?}` · `{op:"remove", recommendation_id}` · `{op:"reorder", recommendation_id, position}` · `{op:"replace", recommendation_id, recommendation: NewRecommendation}`. (`lock`/`unlock` exist in the union but are user-only.) Recommendations in `add`/`replace` take a `content_id` **or** a raw `ref`, exactly as in `create_plan`. |

**Output**

| Field | Type | Meaning |
|---|---|---|
| (whole result) | `ConsumptionPlan` | The updated plan (spec §11), recommendations in new position order with per-item `consumption_state`. |
| `total_duration_seconds` | integer | Sum of `duration_seconds` over recommendations that are not soft-removed. Since 0.3 a protocol `ConsumptionPlan` field (spec §11), populated by the server — no longer a tool-result-envelope extra. |

**Example**

Request:

```json
{
  "plan_id": "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b",
  "ops": [
    {
      "op": "add",
      "position": 1,
      "recommendation": {
        "content_id": "ep_0198a7e3-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
        "why": "Replacement skeptical take that is actually playable: a founder on real GPU serving costs.",
        "contrasting_perspective": true
      }
    }
  ]
}
```

Response (abridged `ConsumptionPlan`):

```json
{
  "cueback_version": "0.4",
  "plan_id": "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b",
  "title": "AI coding-agent economics — this week",
  "brief": { "goal": "Understand the economics of AI coding agents", "available_minutes": 120, "knowledge_level": "intermediate", "preferences": ["prefer practitioners", "avoid beginner AI explanations", "include one skeptical perspective"], "retention": "playlist_lifetime" },
  "recommendations": [
    { "recommendation_id": "rec_0198a9c1-4f5a-7b6c-8d7e-9f0a1b2c3d4e", "position": 0, "why": "A practitioner walks through real inference cost curves — directly addresses the margin question.", "match_basis": "publisher_transcript", "contrasting_perspective": false, "locked": false, "added_by": "assistant", "consumption_state": "not_started", "content": { "content_type": "podcast_episode", "episode_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c", "show_id": "show_0198a7e0-4c1d-7a2b-8f3e-2b9d4c5e6f70", "title": "The Economics of AI Inference", "show_title": "Practical AI Infrastructure", "duration_seconds": 3540, "published_at": "2026-07-14T09:00:00Z", "has_publisher_transcript": true, "already_listened": false } },
    { "recommendation_id": "rec_0198a9c1-5a6b-7c8d-9e0f-1a2b3c4d5e6f", "position": 1, "why": "Replacement skeptical take that is actually playable: a founder on real GPU serving costs.", "match_basis": "metadata", "contrasting_perspective": true, "locked": false, "added_by": "assistant", "consumption_state": "not_started", "content": { "content_type": "podcast_episode", "episode_id": "ep_0198a7e3-1a2b-7c3d-8e4f-5a6b7c8d9e0f", "show_id": "show_0198a7e5-3c4d-7e5f-8a6b-7c8d9e0f1a2b", "title": "Betting the Company on GPUs", "show_title": "Founders in the Loop", "duration_seconds": 2760, "published_at": "2026-06-30T05:00:00Z", "has_publisher_transcript": false, "already_listened": false } }
  ],
  "created_by": "claude",
  "created_at": "2026-07-29T18:12:03Z",
  "player_link": "https://rovyn.app/l/8f3kQ2mVx1",
  "total_duration_seconds": 6300
}
```

**Errors / edge cases**

- **Atomic batch:** any rejected op fails the entire batch; the plan is unchanged.
- `locked_recommendation` when a `remove`, `replace`, or `reorder` targets a user-locked
  recommendation (spec §13) — assistants cannot remove, replace, or explicitly move
  locked recommendations.
- `op_not_allowed` when an assistant sends `lock` or `unlock` (user-only ops).
- `content_unavailable` when an `add`/`replace` fails resolution — unlike `create_plan`,
  there is no partial application; the error message carries the `UnavailableReason`.
- `not_found` for an unknown `plan_id` or `recommendation_id`, or a plan belonging to a
  different user.
- `remove` is a soft delete (the recommendation keeps `consumption_state: "removed"` in
  history); positions of the remaining ones are compacted.

---

## 5. `get_plan`

**Purpose.** Fetch a plan with per-recommendation consumption-state summary. This is how
an assistant checks progress mid-week, and how a *different* assistant picks up a plan
created by another one (switching assistants without losing state).

**Scope:** `plans:read`.

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `plan_id` | string (`pl_…`) | yes | Plan to fetch (must belong to the connection's user). |

**Output**

| Field | Type | Meaning |
|---|---|---|
| (whole result) | `ConsumptionPlan` | Spec §9; each recommendation carries `consumption_state` (`not_started` \| `in_progress` \| `completed` \| `removed`). |
| `total_duration_seconds` | integer | Runtime of the recommendations that are not soft-removed — i.e. what is still worth consuming. Since 0.3 a protocol `ConsumptionPlan` field (spec §11). |
| `user_title` | string, optional | What the **user** renamed this edition to, present only if they did (spec §11). Read-only to you — see below. |

**Example**

Request:

```json
{ "plan_id": "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b" }
```

Response: same `ConsumptionPlan` shape as the `update_plan` example above, e.g. with the
first recommendation now `"consumption_state": "in_progress"` and `"locked": true` after
the user started it and locked it in the app.

**Errors / edge cases**

- `not_found` for unknown IDs or another user's plan (no existence leak).
- `consumption_state` is a coarse summary derived from stored playback progress; it is
  **not** consumption telemetry. Fine-grained behavior only ever reaches assistants as
  `ConsumptionReceipt`s, via `get_recent_receipts` (scope-gated).
- Works across assistants: any of the same user's connections with `plans:read` can read
  it, regardless of which assistant created it.
- **`user_title` is what the user calls this edition** — it appears once they rename it in
  the app, and when it is there it is the name on their screen, above your `title` and
  `brief.goal` (spec §11, headline precedence). Use it when you refer to the edition,
  the way you would use a name someone corrected you on. You cannot set it: there is no
  tool and no `PlanUpdateOp` for renaming, and your `title` / `brief.goal` are returned
  untouched exactly as you wrote them. An edition the user has renamed is not a signal that
  anything went wrong — it is a shelf they are keeping.

---

## 6. `get_recent_receipts`

**Purpose.** Retrieve recent `ConsumptionReceipt`s so the next plan can improve. Receipts
are compact summaries built server-side from consumption events and user feedback; raw
playback events never leave the server.

**Read `user_feedback` first.** It carries the user's own words, verbatim and
chronological — the highest-value field in the object, and the one no enum can replace.
The `consumption` block tells you what happened; `user_feedback` tells you what they
thought about it (spec §16). Since 0.3 a plan-attributed receipt also names its
`recommendation_id` / `plan_id` and echoes the pick's `why` /
`contrasting_perspective`, so you can adapt without a second `get_plan`; and
`content_length` (`{ unit, value }`) sizes the content media-neutrally.

**Mixed versions are normal.** Receipts are stored snapshots: rows written by an older
minor keep their stored `cueback_version` and shape, so one page may mix e.g. `"0.3"`
and `"0.4"` receipts (and a 0.2 receipt lacks the attribution fields and may carry the
retired `direction` chip). This is exactly what spec §3 tolerance exists for — parse
tolerantly, never reject a page over an old receipt.

**Scope:** `receipts:read` (strictly enforced — this is the privacy-sensitive tool).

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `since` | string (ISO 8601) | no | Only receipts created after this instant. |
| `plan_id` | string (`pl_…`) | no | Only receipts for content in this plan. |
| `limit` | integer | no | Max receipts; default 20. |

**Output**

| Field | Type | Meaning |
|---|---|---|
| `receipts` | `ConsumptionReceipt[]` | Newest first; may be empty. Shape in spec §16. |

**Example**

Request:

```json
{ "plan_id": "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b", "limit": 5 }
```

Response:

```json
{
  "receipts": [
    {
      "cueback_version": "0.4",
      "receipt_id": "rcpt_0198b3d4-6e7f-7a8b-9c0d-1e2f3a4b5c6d",
      "content_type": "podcast_episode",
      "content_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
      "content_title": "The Economics of AI Inference",
      "source_title": "Practical AI Infrastructure",
      "recommended_for": "Understand the economics of AI coding agents",
      "recommendation_id": "rec_0198a9c1-4f5a-7b6c-8d7e-9f0a1b2c3d4e",
      "plan_id": "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b",
      "why": "A practitioner walks through real inference cost curves — directly addresses the margin question.",
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
          "occurred_at": "2026-07-29T21:38:12Z"
        }
      ],
      "created_at": "2026-07-29T21:40:00Z"
    }
  ]
}
```

**Errors / edge cases**

- `forbidden_scope` without `receipts:read` — the whole call fails; there is no
  reduced-detail fallback.
- No receipts yet → success with `"receipts": []`.
- `not_found` when `plan_id` is supplied but unknown / not this user's.
- **Interpretation caveats are normative** (spec §16): unfinished may mean the commute
  ended; completed may be autoplay; a forward skip may be an ad-skip; one session is not a
  permanent preference; feedback outweighs passive behavior, and the user's words outrank
  the taps.
- `user_feedback` is verbatim. Quote it back or reason from it, but do not treat your
  paraphrase as what the user said, and do not write a paraphrase back through
  `record_feedback`.
- Receipts include content from plans created by *other* assistants of the same user —
  that is the point of cross-assistant portability, and precisely why the scope gate
  exists.

---

## 7. `record_feedback`

**Purpose.** Record deliberate user feedback expressed to the assistant in conversation
("that second one was too basic — I wanted the operator view, not the explainer"), so it
lands in the same feedback store the app writes to and flows into future receipts.
Recorded with `source: "assistant"`.

**Prefer the user's words.** `user_feedback` is a verbatim string; `structured` is the
optional one-tap-shaped convenience. If the user said something specific, send the
sentence — do not compress it into enums and throw the sentence away. At least one of the
two must be present; sending both is normal and encouraged.

**Scope:** `feedback:write`.

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `content_id` | string (`ep_…` in V1) | yes | The content the feedback is about. |
| `structured` | `StructuredFeedback` | one of | At least one field set (spec §15): `value?`, `difficulty?`, `length?`, `flags?`, `tags?`. (`direction` was removed in the 0.3 clean break.) |
| `user_feedback` | string | one of | What the user actually said, verbatim. Stored and returned unchanged. |
| `occurred_at` | string (ISO 8601) | no | **0.3.** When the user actually said it. Set it when relaying something said earlier in the conversation, so the receipt's chronology is honest; the server stamps arrival time when absent. |
| `recommendation_id` | string (`rec_…`) | no | **0.3.** The recommendation the user is reacting to, when known — the receipt attributes the judgment to it, and that plan's receipt is refreshed. Unknown or other-user ids fail `not_found`. |

At least one of `structured` / `user_feedback` is required.

**Output**

| Field | Type | Meaning |
|---|---|---|
| `ok` | `true` | Feedback stored. |

**Example**

Request:

```json
{
  "content_id": "ep_0198a7e3-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
  "structured": {
    "difficulty": "too_basic",
    "value": "not_worth_my_time",
    "flags": ["too_promotional"]
  },
  "user_feedback": "way too much sponsor talk and it never got past the 101 stuff",
  "occurred_at": "2026-07-29T18:40:00Z",
  "recommendation_id": "rec_0198a9c1-5a6b-7c8d-9e0f-1a2b3c4d5e6f"
}
```

Response:

```json
{ "ok": true }
```

**Errors / edge cases**

- `forbidden_scope` without `feedback:write`.
- `validation_failed` when neither `structured` nor `user_feedback` is present, when
  `structured` has no fields set, or when `flags` contains a value outside
  [`too_repetitive`, `too_promotional`].
- `not_found` for unknown `content_id`, and for a `recommendation_id` that is unknown or
  belongs to another user's plan (no existence leaks).
- Feedback must reflect what the **user actually said** — assistants must not synthesize
  feedback from their own inference about receipts, and must not "clean up" a verbatim
  quote before sending it.
- Multiple submissions for the same content are allowed (the user may refine): structured
  fields merge with later values winning, while `user_feedback` entries accumulate
  chronologically in the receipt — nothing is overwritten.

---

## 8. `create_player_link`

**Purpose.** Mint a universal link for an existing plan. Opening the link in the app
claims the plan for that device. `create_plan`
already returns a `player_link`; this tool exists to mint a fresh one later (re-share,
expired/lost link, or a plan that predates the link).

**Scope:** `plans:write`.

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `plan_id` | string (`pl_…`) | yes | Plan to link (must belong to the connection's user). |

**Output**

| Field | Type | Meaning |
|---|---|---|
| `url` | string (URL) | Universal link embedding a unique claim token, e.g. `https://rovyn.app/l/8f3kQ2mVx1`. Opens the app when installed; otherwise a web landing page with install instructions. |

**Example**

Request:

```json
{ "plan_id": "pl_0198a9c1-2d3e-7f40-9a5b-6c7d8e9f0a1b" }
```

Response:

```json
{ "url": "https://rovyn.app/l/9tQ4rW7xZp" }
```

**Errors / edge cases**

- `forbidden_scope` without `plans:write`.
- `not_found` for an unknown or other-user `plan_id`.
- Each call mints a **new** token; previously minted links for the plan remain valid until
  claimed.
- Claiming is one-shot per token: the first device to open the link claims it (the
  server records when, and by which device); the same device may re-open the
  link idempotently, other devices get a clear "already claimed" answer.
- Claiming runs on the app's own device session because claiming *binds* the link to
  one device. In the reference implementation that session is minted **behind a completed
  sign-in**, so a first tap on a fresh install opens the welcome screen rather than the
  plan — describe player links to the user accordingly, not as zero-friction. The claim
  then succeeds only when the claiming device's account owns the plan; any other owner
  gets an "account mismatch" rejection, which in practice means the user must sign in to
  the app with the same identity they used at your consent screen.
- The unguessable token is the capability, which is why links should be delivered only to
  the user in chat.

---

# Catalog-ergonomics extensions

The three tools below are not part of the core loop's named list (which is explicitly
non-exhaustive). They exist because the assistant-side loop had sharp edges that only
showed up in real use — batching, whole-show import, and knowing what the library holds.
Their shapes and scopes are as normative as the rest of this document.

## 9. `resolve_content_batch`

**Purpose.** Batch form of `resolve_content`: validate a whole web-discovered candidate
list in **one** call. This is the normal grounding step after the assistant's own web
search — resolve first, then build a plan from what came back playable.

Field feedback that motivated it: the import path was a brittle chain — web-search titles
→ guess exact strings → resolve one at a time. Ten candidates meant ten round trips, and
there was no way to see the whole verdict list before committing.

**Scope:** none (any authenticated connection). As with `resolve_content`,
`already_listened` reads `false` unless the connection holds `receipts:read`.

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `refs` | `ContentRef[]` | yes | 1–25 refs. Each `podcast_episode` ref needs at least one of `episode_id` / `guid` / `feed_url` / `episode_url`; `title`, `show_title`, `published_at` are hints that materially improve matching. |

**Output**

| Field | Type | Meaning |
|---|---|---|
| `results` | `{ input_index: integer, status: "playable" \| "unavailable", content?: ResolvedContent, reason?: UnavailableReason }[]` | One verdict per input ref, **in input order**, each also carrying its `input_index` so the mapping survives any reordering downstream. |

**Example**

Request:

```json
{
  "refs": [
    { "content_type": "podcast_episode", "episode_url": "https://practicalai.example.com/episodes/economics-of-ai-inference", "title": "The Economics of AI Inference" },
    { "content_type": "podcast_episode", "episode_url": "https://open.spotify.com/episode/4kZq1", "title": "Agents, Exclusively" },
    { "content_type": "podcast_episode", "feed_url": "https://foundersintheloop.example.com/rss", "title": "Betting the Company on GPUs", "published_at": "2026-06-30" }
  ]
}
```

Response:

```json
{
  "results": [
    {
      "input_index": 0,
      "status": "playable",
      "content": {
        "content_type": "podcast_episode",
        "episode_id": "ep_0198a7e2-9b3c-7d4e-a5f6-0718293a4b5c",
        "show_id": "show_0198a7e0-4c1d-7a2b-8f3e-2b9d4c5e6f70",
        "title": "The Economics of AI Inference",
        "show_title": "Practical AI Infrastructure",
        "duration_seconds": 3540,
        "published_at": "2026-07-14T09:00:00Z",
        "has_publisher_transcript": true,
        "already_listened": false
      }
    },
    { "input_index": 1, "status": "unavailable", "reason": "spotify_exclusive" },
    {
      "input_index": 2,
      "status": "playable",
      "content": {
        "content_type": "podcast_episode",
        "episode_id": "ep_0198a7e3-1a2b-7c3d-8e4f-5a6b7c8d9e0f",
        "show_id": "show_0198a7e5-3c4d-7e5f-8a6b-7c8d9e0f1a2b",
        "title": "Betting the Company on GPUs",
        "show_title": "Founders in the Loop",
        "duration_seconds": 2760,
        "published_at": "2026-06-30T05:00:00Z",
        "has_publisher_transcript": false,
        "already_listened": false
      }
    }
  ]
}
```

**Errors / edge cases**

- **A per-item failure never fails the batch.** An unreachable feed host or a candidate
  that throws mid-pipeline becomes that item's
  `{ "status": "unavailable", "reason": "resolution_failed" }` — since 0.3 the server
  says honestly that IT failed, instead of the old conflation with `no_public_feed`
  (which is now reserved for the verified fact that no public feed exists). The other 24
  verdicts still come back, and a `resolution_failed` item is worth retrying or re-refing.
  Unavailability is a successful result, as in `resolve_content`.
- Article refs come back `unsupported_content_type` per item — they never fail the batch
  either.
- `validation_failed` when `refs` is empty, longer than 25, or a podcast entry carries
  none of the four identifiers (hints alone are not a valid ref).
- Resolution runs at most **4 refs concurrently** — a bound on the load one tool call puts
  on publishers' servers and on Podcast Index. A 25-ref call with cold feeds is therefore
  not instant; batch what you actually intend to use.
- **The whole call is time-boxed to 25s.** When the budget expires the server does not
  hang and does not guess: refs already grounded keep their verdicts (catalog hits still
  answer, since they need no network), and the rest come back
  `{ "status": "unavailable", "reason": "resolution_failed" }`. That is a statement about
  the server, so re-sending just those refs in a smaller batch usually succeeds — and
  the ones that resolved are now in the catalog, so they come back instantly.
- Successful resolutions permanently import that content, so a later `search_episodes`
  finds it.
- Whole show rather than a list of episodes? Use `import_feed`.

---

## 10. `import_feed` *(podcast profile)*

**Purpose.** Import a **whole show** into the library — feed, show metadata, and its
entire back catalog of episodes — so the assistant can then `search_episodes` or
`list_shows` *within* it. Also records the follow itself — durable, user-scoped state:
this show is now part of the user's library, not an incidental byproduct of one
resolution.

**This is the only full ingest**, and deliberately so (just-in-time ingest is capped): resolving an episode writes that episode plus the feed's 50 most recent items,
because the user asked for an episode. Here they asked for the SHOW. Running it on a show
that resolution already touched *completes* it — the upsert refreshes those rows in place
(same episode ids), so plans and progress pointing at them survive.

Prefer it over `resolve_content_batch` when:

- web search surfaced a **show** rather than specific episodes ("the user should follow
  Latent Space");
- several episodes from one show are wanted — one import beats N resolutions;
- the back catalog needs browsing and the web cannot enumerate it;
- the feed is **awkward to fetch client-side**. The server's fetcher handles gzip,
  redirects, feed quirks, and Podcasting 2.0 tags — hand it the URL rather than parsing
  XML in-context.

**Scope:** `plans:write` (it mutates the catalog and the user's library).

**Input** — exactly one of the three (enforced; two identifiers that disagree would
silently import whichever the resolver preferred):

| Field | Type | Required | Meaning |
|---|---|---|---|
| `feed_url` | string (URL) | one of the three | Direct RSS/Atom feed URL. Fastest and most certain — it *is* the canonical key. |
| `apple_url` | string (URL) | one of the three | A `podcasts.apple.com/…/idNNNNNNNN` **show** link; the feed is looked up from the iTunes id via Podcast Index. |
| `show_title` | string | one of the three | Show name, resolved through the directory's top search hit. Least certain — check the returned `title` before telling the user what was imported. |

**Output**

| Field | Type | Meaning |
|---|---|---|
| `show_id` | string (`show_…`) | Catalog id of the imported show. |
| `title` | string | Show title as the feed declares it — **verify this matches what you meant**, especially after a `show_title` lookup. |
| `feed_url` | string (URL) | The **canonical** feed URL the catalog deduped on; may differ from the input. |
| `episode_count` | integer | Episodes now queryable for this show (read back from the catalog, not just this fetch). |
| `latest_published_at` | string (ISO 8601) | Publication time of the newest episode; absent when the feed carries none. |

**Example**

Request:

```json
{ "apple_url": "https://podcasts.apple.com/us/podcast/practical-ai-infrastructure/id1621234567" }
```

Response:

```json
{
  "show_id": "show_0198a7e0-4c1d-7a2b-8f3e-2b9d4c5e6f70",
  "title": "Practical AI Infrastructure",
  "feed_url": "https://practicalai.example.com/rss",
  "episode_count": 84,
  "latest_published_at": "2026-07-28T09:00:00Z"
}
```

**Errors / edge cases**

- `forbidden_scope` without `plans:write`.
- `validation_failed` when zero or more than one of `feed_url` / `apple_url` /
  `show_title` is supplied.
- `show_not_found` when no candidate feed exists anywhere — a real dead end. Retry
  with a direct `feed_url`, or a more exact `show_title`.
- `feed_unreachable` when a candidate feed was found but will not fetch or parse —
  including when the call's 25s budget expires before the feed answers. The follow is
  not recorded in that case — a follow must never point at nothing. Retry
  is reasonable: a big back catalog off a slow origin can be a genuinely slow first
  import, and the second attempt is not competing with a cold directory lookup.
- **Idempotent.** Shows dedupe on the canonical `feed_url` and episodes on
  `(show_id, guid)`, so re-importing refreshes metadata and picks up new episodes without
  duplicating anything. Calling it again is how you refresh a show.
- Podcast Index being down or unconfigured degrades rather than fails: a direct `feed_url`
  still imports; an `apple_url` or `show_title` may not resolve.
- A follow recorded this way is always a **public**-feed follow. Private/authorized
  feeds carry credentials and are added by the **user** in the app, never by an
  assistant.

---

## 11. `list_shows` *(podcast profile)*

**Purpose.** Learn what the library actually holds — in one call, instead of probing with
speculative searches. Returns every show with its episode count, how many episodes carry
publisher transcripts, and when it last published.

Field feedback that motivated it: there was no way to see the catalog's contents, so an
assistant guessed at queries, got empty results, and could not tell "wrong query" from
"empty library".

Call it first when the user asks something like "anything new in my shows?", or right
after a thin `search_episodes` result.

**Scope:** none (any authenticated connection).

**Input**

| Field | Type | Required | Meaning |
|---|---|---|---|
| `limit` | integer | no | Max shows; default 50, hard max 200. |

**Output**

| Field | Type | Meaning |
|---|---|---|
| `shows` | `ShowSummary[]` | Ordered by `title`. |

`ShowSummary`:

| Field | Type | Meaning |
|---|---|---|
| `show_id` | string (`show_…`) | Catalog id. |
| `title` | string | Show title. |
| `feed_url` | string (URL) | Canonical feed URL — pass it back to `import_feed` to refresh the show. |
| `categories` | string[] | Publisher-declared categories; `[]` when the feed declares none. |
| `episode_count` | integer | Episodes in the catalog for this show. |
| `episodes_with_transcripts` | integer | How many carry a **publisher** transcript (V1 never generates transcripts). |
| `latest_published_at` | string (ISO 8601) | Newest episode's publication time; absent when the show has no episodes. |

**Example**

Request:

```json
{ "limit": 50 }
```

Response:

```json
{
  "shows": [
    {
      "show_id": "show_0198a7e5-3c4d-7e5f-8a6b-7c8d9e0f1a2b",
      "title": "Founders in the Loop",
      "feed_url": "https://foundersintheloop.example.com/rss",
      "categories": ["Business", "Technology"],
      "episode_count": 41,
      "episodes_with_transcripts": 0,
      "latest_published_at": "2026-07-22T05:00:00Z"
    },
    {
      "show_id": "show_0198a7e0-4c1d-7a2b-8f3e-2b9d4c5e6f70",
      "title": "Practical AI Infrastructure",
      "feed_url": "https://practicalai.example.com/rss",
      "categories": ["Technology"],
      "episode_count": 84,
      "episodes_with_transcripts": 61,
      "latest_published_at": "2026-07-28T09:00:00Z"
    }
  ]
}
```

**Errors / edge cases**

- Empty library → success with `{ "shows": [] }`. That is the honest answer to "what do I
  have?", and the cue to `import_feed`.
- `validation_failed` when `limit` is non-positive or above 200.
- A show whose feed was reachable but empty still appears, with `episode_count: 0` — the
  subscription exists even when the episodes do not.
- **This is a library inventory, not a catalog of all podcasts.** A show missing here has
  simply not been imported yet; `import_feed` fixes that. Never tell the user a show
  "isn't available" on the strength of its absence from this list.
