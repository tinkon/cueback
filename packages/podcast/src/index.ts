/**
 * @cueback/podcast — the podcast profile of the Cueback protocol: the objects
 * a media profile must publish (SPEC.md §22), currently `PlaybackEvent`
 * (SPEC.md §14) and `EpisodeSearchResult` (SPEC.md §6; MCP-TOOLS.md §1). Zod
 * v3 schemas are the source of truth; TS types are inferred via z.infer.
 * Depends on @cueback/core only; must never import from an application.
 */
export * from "./playback-event.js";
export * from "./search.js";
