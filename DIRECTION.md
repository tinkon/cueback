# Cueback — Direction

Status: **locked** (0.2 restructure, 2026-07-31; references refreshed for protocol 0.4,
2026-08-09). This is the "why" document behind the 0.2 rename. Canonical names, shapes,
and semantics: [SPEC.md](./SPEC.md). Tool surface: [MCP-TOOLS.md](./MCP-TOOLS.md).

> **Cueback is an open MCP convention for handing AI-curated content to the apps where
> users consume it and returning lightweight consumption context and user feedback to
> the assistant.**

---

## 1. The problem

Assistants have become good at deciding *what a person should read, watch, or listen to*.
They hold the conversation, the goal behind it, web search, and enough judgment to say
"these four things, in this order, for these reasons." What they cannot do is deliver:
they hand back a wall of links, and the actual consumption happens somewhere else — a
podcast player, a read-later app, a video app — which knows nothing about why any of it
was recommended.

The break runs in both directions:

- **Downstream.** A recommendation loses its editorial context the moment it leaves the
  chat. The player shows a title and a duration; the *why* is gone. Nothing verifies that
  the thing is even consumable — half the assistant's picks are paywalled, exclusive to a
  platform, or simply hallucinated.
- **Upstream.** Nothing comes back. The assistant never learns that the user finished
  three of four, bailed six minutes into the fourth, and said "too basic, and the host
  talks over everyone." Next week it recommends the same kind of thing again.

Two glue problems, one shape. Cueback is the convention for that shape: a **cue** goes
out to the app that can actually deliver it, and lightweight **feedback** comes back.

## 2. The loop

```
   assistant                       Cueback server + app                user
   ─────────                       ────────────────────                ────
   goal → Brief
   candidates (its own search)
        │  create_plan(brief, recommendations)
        ▼
                            ground every ref → ConsumptionPlan
                            (playable only) → player link
                                                 │
                                                 ▼
                                          consumption in the app
                                          (progress, skips, completion)
                                          + whatever the user says
                                                 │
                            ConsumptionReceipt ◄─┘
        │  get_recent_receipts
        ◄────────────────────────
   next plan is better
```

Four properties make the loop worth having:

1. **Grounding.** The assistant can discover content anywhere; only the server can
   declare it consumable. A ref becomes a `ResolvedContent` or a machine-readable
   `UnavailableReason` — never a dead link handed to a user.
2. **The editorial context travels.** Every `Recommendation` carries the assistant's
   `why`, the `goal_supported`, whether it is a deliberate contrasting perspective, and
   what the match was grounded in (`match_basis`).
3. **The return path is small and permissioned.** Raw consumption events stay on the
   server. What crosses back is a `ConsumptionReceipt`: outcome, progress, time spent,
   optional structured feedback, and the user's verbatim words — gated by a scope the
   user granted to that one assistant.
4. **The user is in control at both ends.** The inbound context is a scoped `Brief`, not
   a memory dump; recommendations can be locked against assistant edits; each assistant
   connection is revocable on its own.

## 3. Core objects

Media-neutral, in `@cueback/core`:

| Object | Role |
|---|---|
| `Brief` | The scoped statement of intent the assistant sends. The **only** inbound context object — no history, no profile, no memory. |
| `ContentRef` | An assistant-side reference, possibly hearsay. Discriminated union on `content_type`. Makes no claim of consumability. |
| `ResolvedContent` | Server-grounded content: it exists, it validated, its metadata is the server's ground truth. Discriminated union on `content_type`. |
| `ResolutionResult` + `UnavailableReason` | The verdict on a ref. Unavailability is an expected outcome, not an error. |
| `ConsumptionPlan` | The ordered, grounded set of recommendations — the deliverable the user opens in the app. |
| `Recommendation` | One grounded item plus its editorial annotations (`why`, `goal_supported`, `match_basis`, `contrasting_perspective`, `locked`). |
| `PlanUpdateOp` | Edit operations, applied atomically; `lock`/`unlock` are user-only. |
| `ConsumptionReceipt` | What comes back: a deterministic `consumption` block, optional `structured_feedback`, and first-class verbatim `user_feedback`. |
| `StructuredFeedback` | The one-tap convenience (worth my time / too basic / too long). Optional, never a substitute for words. |
| `StandingFeedback` | The standing corpus of what the user has written, riding the tools the assistant already calls. Optional capability; promoted from envelope extension to protocol in 0.4. |
| `AssistantHandoff` | A short-lived, single-use context capsule when the user asks their assistant *about* what they are consuming. |
| `AssistantConnection` + `Scope` | The permission envelope: one connection per assistant, independently scoped and revocable. |

Profile packages (today `@cueback/podcast`) add the medium-specific pieces: raw
consumption events (`PlaybackEvent`) and search result shapes (`EpisodeSearchResult`).

## 4. The design principle

> **Structure observable behavior. Preserve human expression. Let the assistant
> interpret meaning.**

This is the line that decides every schema argument in Cueback.

- **Observable behavior gets structure.** Did they finish it? How far did they get? How
  many minutes were actually spent? These are deterministic, comparable across media, and
  computable without judgment — so they live in a typed `consumption` block with an
  enumerated `outcome`.
- **Human expression is preserved verbatim.** "Too basic, and the host talks over
  everyone" is worth more than any enum, and any attempt to bucket it destroys the part
  that mattered. `user_feedback` entries are stored exactly as typed, in chronological
  order, and never summarized, classified, sentiment-scored, or rewritten by the server.
- **Interpretation belongs to the assistant.** The server does not decide that 40%
  completion means dislike, or that a skip means boredom. It reports; the model — which
  has the conversation, the goal, and the user's own words — infers. This is also why
  Cueback needs no recommendation engine of its own: the intelligence is already at the
  other end of the connection.

The corollary is a hard rule: **no server-side inference.** No taste profiles, no
embeddings of user behavior, no ranking model. There is nothing hidden to inspect or
delete, because nothing hidden is ever computed.

## 5. MCP layering

Cueback is not a new transport. It is a convention *on top of* MCP, layered so that a
future non-podcast implementation shares everything above the profile line:

```
┌───────────────────────────────────────────────┐
│ Assistant (ChatGPT / Claude / Gemini / local) │
└──────────────────┬────────────────────────────┘
                   │ MCP, Streamable HTTP, one connection = one authorization
┌──────────────────▼────────────────────────────┐
│ Cueback conventions (@cueback/core)           │  Brief, ContentRef, ResolvedContent,
│  plan / receipt / feedback / handoff objects  │  ConsumptionPlan, ConsumptionReceipt,
│  scopes: plans:*, receipts:read, feedback:*   │  StructuredFeedback, AssistantHandoff
├───────────────────────────────────────────────┤
│ Media profile (@cueback/podcast)              │  PlaybackEvent, EpisodeSearchResult,
│  medium-specific events + search shapes       │  medium-specific tools
├───────────────────────────────────────────────┤
│ App/server implementation (Rovyn)             │  catalog, resolver, receipt builder,
│  tools, REST, storage                         │  player links, iOS player
└───────────────────────────────────────────────┘
```

Three rules keep the layering honest:

1. **`@cueback/core` and `@cueback/podcast` never import from an implementation.** They stay
   dependency-clean (zod + ids only) so the protocol packages can be published or
   open-sourced without dragging an app along.
2. **Media-neutral tools take media-neutral objects.** `create_plan`, `update_plan`,
   `get_plan`, `get_recent_receipts`, `record_feedback`, `resolve_content`,
   `resolve_content_batch` are Cueback-shaped. `search_episodes`, `import_feed`,
   `list_shows` are podcast-profile tools; `create_player_link` is an app tool.
3. **Division of labor is part of the convention, not just the docs.** The assistant is
   the discovery engine (web search, currency, conversation); the Cueback server is the
   grounding layer (resolve, import, validate, remember, report). The server surfaces
   this in its MCP `instructions` and in every tool description, because for a model the
   description *is* the UX.

## 6. Media profiles

A profile is what makes a medium concrete. To add one you must define: the
`ContentRef` variant (how the assistant names the thing), the `ResolvedContent` variant
(what the server guarantees), the raw consumption event vocabulary, and how the
`consumption` block is computed from those events — `progress_percent` and
`time_spent_minutes` must remain meaningful and honest for the medium.

| Profile | Status | Notes |
|---|---|---|
| **Podcast** (`podcast_episode`) | **Implemented** — the only one in V1 | RSS/Podcast Index catalog, enclosure validation, `PlaybackEvent`, publisher transcripts only |
| **Article** (`article`) | **Schema only** | `ContentRef`/`ResolvedContent` variants exist so the union is real and not a rename-in-waiting; nothing resolves them. Server paths reject article refs with `unsupported_content_type` |
| Book | Future | Chapter/location progress; "finished" is a weaker signal over a longer arc |
| Video | Future | Watch spans, chapters; skip semantics differ sharply from audio |
| Course / lecture series | Future | Multi-session arcs; a plan may span weeks and completion is per-module |

The article variant earns its place by proving the union: `content_type` discrimination,
the `unsupported_content_type` guard, and media-neutral field names (`content_id`,
`content_title`, `source_title`, `time_spent_minutes`) are all exercised by having a
second variant in the type system, even with zero runtime support.

**Second-medium validation is a prerequisite for protocol 1.0.** One implemented medium
cannot prove media-neutrality; the abstraction is a hypothesis until a real article or
video profile ships against it.

## 7. What we are not building

- **No recommendation engine, no server-side inference.** No taste profiles, ranking
  models, embeddings of behavior, or semantic search. The assistant curates.
- **No generated transcripts.** Publisher-provided only, and the match must disclose
  `match_basis`.
- **No sentiment analysis or classification of user feedback.** Verbatim in, verbatim
  out.
- **No social features, monetization, or advertising** in the app.
- **No raw-event egress.** Consumption events are server-internal, full stop; receipts
  are the ceiling of what any assistant can see.
- **No sale of consumption data and no model-training use** without separate explicit
  consent — and V1 ships no consent surface, therefore no such use.
- **No second protocol.** Cueback rides MCP; it adds objects and conventions, not a
  transport, a registry, or an identity system.

## 8. Naming

- **Cueback** is the protocol: the objects, the MCP tool conventions, the scopes, and the
  layering rules. Versioned as `cueback_version` (currently `"0.4"`). Kept
  dependency-clean so the protocol packages publish without dragging an app along.
- **Rovyn** is the app: the iOS player and the server behind it — one implementation of
  Cueback, podcast profile, and a proprietary product. Bundle `com.rovyn.app`, URL scheme
  `rovyn://`, MCP server name `rovyn`.

The distinction matters because the two can diverge: another app may implement Cueback
without Rovyn, and Rovyn may ship product surfaces (the shelf, editions)
that are no part of the protocol. When a name has to be chosen, protocol names are
media-neutral (`content`, `plan`, `consumption`) and Rovyn's user-facing vocabulary stays
warm and product-specific ("editions on a shelf" — unchanged by this restructure).

## 9. Lineage

The 0.1 protocol was ListenMesh: the same loop, hard-coded to podcasts. 0.2 generalized
it into Cueback and named the app Rovyn (§8). There were no external users, so the cut
was clean — no aliases, no back-compat shims — and the rename is where the wire
vocabulary was chosen media-neutral: refs and resolved content rather than episodes,
plans rather than playlists, consumption rather than listening. The one change that was
not a rename is the receipt restructure: the receipt math — spans, the outcome ladder,
merge rules — was untouched, but `user_feedback` became a first-class array beside the
deterministic `consumption` block, which is the shape [SPEC.md](./SPEC.md) §16 specifies
today. The field-by-field migration mapping is internal history of the predecessor and
lives with the implementation's own documentation, not here.

## 10. Open direction questions

The ones that bear on the protocol's direction rather than the product's:

- **Second-medium validation before 1.0.** Which medium proves the abstraction, and how
  much of the article profile has to become real before `cueback_version` can go `1.0`.
- **Whether profiles are protocol or convention.** Today a profile is a package plus
  prose. If several ship, profiles may need their own registration/versioning story.

(One former open question is closed: the protocol is being published. 0.4 is the final
pre-publication revision, and [SPEC.md](./SPEC.md) is the canonical, self-contained
specification a third-party implementer builds against.)
