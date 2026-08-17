# @cueback/core

**Cueback** is an open MCP convention for handing AI-curated content to the apps
people actually consume it in, and for handing back lightweight consumption
context plus the user's own verbatim feedback.

This package holds the media-neutral half of the protocol: `Brief`,
`ContentRef` / `ResolvedContent`, `ConsumptionPlan` / `Recommendation`,
`ConsumptionReceipt`, `StructuredFeedback`, `StandingFeedback`,
`AssistantHandoff` (draft), scopes, id prefixes, and the protocol version
(`cueback_version`, currently `0.4`).

Zod v3 schemas are the source of truth; TypeScript types are inferred with
`z.infer`. The wire format is JSON with `snake_case` keys, mirrored exactly in
TypeScript — there is no case-mapping layer.

## Producer vs consumer usage

Minor protocol versions are additive (SPEC.md §3), so the schemas serve two jobs:

- **Consumer usage — parse what someone else produced.** The document schemas
  (`ConsumptionPlanSchema`, `ConsumptionReceiptSchema`, `ResolutionResultSchema`, …)
  are tolerant by construction: `cueback_version` accepts any `0.x`, unknown fields
  are ignored, closed enums parse unknown future values as plain strings (preserved
  verbatim — narrow with `isKnown(EnumSchema, value)` and handle the rest
  conservatively), and an unknown `content_type` parses as *unrecognized content*
  (narrow with `isPodcastEpisodeRef` / `isResolvedPodcastEpisode`). A document
  produced by a newer 0.x minor parses under this release; only a major bump may be
  rejected.
- **Producer usage — validate what you are about to write.** The input schemas stay
  strict so typos die at the door: `StructuredFeedbackSchema` (feedback writes),
  `BriefSchema`, `NewRecommendationSchema` / `PlanUpdateOpSchema`, and the known
  `ContentRef` variants (a podcast ref still needs an identifier; an article ref
  still needs its `url`). Producers stamp `CUEBACK_VERSION` exactly.

The rule of thumb: strict on the way in, tolerant on the way out.

Medium-specific objects live in profile packages (`@cueback/podcast` is the only
implemented one in V1). This package depends on `zod` + `uuid` and nothing else;
it must never import from an implementation, so it stays standalone.

Design principle: *structure observable behavior, preserve human expression, let
the assistant interpret meaning.*

**Versioning note:** 0.4 is the final pre-publication break (SPEC.md §4); the
0.x line is additive-only from here, under the §3 rules.

The canonical specification is [SPEC.md](https://github.com/tinkon/cueback/blob/main/SPEC.md); the assistant-facing
tool surface is [MCP-TOOLS.md](https://github.com/tinkon/cueback/blob/main/MCP-TOOLS.md).

## License

Apache License 2.0. See [LICENSE](https://github.com/tinkon/cueback/blob/main/LICENSE) and [NOTICE](https://github.com/tinkon/cueback/blob/main/NOTICE).
