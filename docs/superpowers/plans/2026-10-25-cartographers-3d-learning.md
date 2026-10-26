# Cartographers 3D Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute task-by-task with scoped review.

**Goal:** Teach the purpose of each move, render a collectible seasonal 3D diorama, and replace edicts with a readable adventurers' guild board.

**Architecture:** Keep engine and network protocol stable. MapBoard adapts the same Board/preview to lazy Three.js or the existing 2D view. Tutorial and guild share a pure score-preview helper. A separate local album stores immutable own-map season snapshots without account services.

**Tech Stack:** Existing React/TypeScript/Vite; add exact-pinned Three.js and types to project-local D-drive node_modules.

## Global constraints
- User approved docs/superpowers/specs/2026-10-25-cartographers-3d-learning-design.md.
- Preserve existing saves, history, multiplayer and other games; no login/cloud.
- Original procedural geometry; clear editable stable camera vs appreciation rotation; distinguish camera drag from cell click.
- Accessible 2D fallback, reduced motion, bounded pixel ratio and GPU resource cleanup.
- No claim of browser QA when tool unavailable; run CPU mapping, scoring, lesson, storage and SSR checks.

## Task 1: 3D map adapter and model scene
Files: MapBoard.tsx, Diorama.tsx, dioramaScene.ts, dioramaMath.ts, diorama.css, tests/cartographers-diorama.test.ts.
Interfaces: existing MapBoard props plus season?:number. Diorama accepts board, season, preview, terrain, invalid, highlight, label,onCell. Canvas data-diorama attribute and data-ready=true once rendered; preserveDrawingBuffer supports export.
- [x] Write failing tests for world cell->grid mapping, out-of-bounds rejection, camera drag threshold, seasonal palettes and deterministic terrain placements.
```ts
assert.deepEqual(worldToCell(-5, -5), [0,0]);
assert.equal(worldToCell(6,6), null);
```
- [x] Build real procedural meshes: trunks/crowns, roofs/walls, wheat rows, water, mountains, monsters and raised land tiles. Share resources and cap detail; no external models.
- [x] Implement lazy scene loading, orthographic editing/appreciation views, plane picking, camera reset, zoom, rotation, seasonal material transition, resize/background/reduced-motion handling and complete disposal.
- [x] Preserve the 2D board and accessible grid, catch GPU/context failure and display a usable fallback.
- [x] Run CPU tests, SSR regressions and type check; document unverified GPU visuals.

## Task 2: Purpose-first tutorial and guild commissions
Files: GameTable.tsx, Tutorial.tsx, tutorial-model.ts, GuildBoard.tsx, commission-model.ts, guild.css, tutorial.css; relevant UI/render tests.
Consumes unchanged engine placementError/reduceGame and scoring scoreBoard/goalHighlights. Passes season into MapBoard.
- [x] Write failing tests proving one forest at edge scores+1 and interior scores0 for sentinel; preview never mutates live map; includes coin/monster deltas and rejects invalid placement.
- [x] Replace toolbar-first eight isolated scenes with causal mission lessons: explain four-season objective; show edge vs interior; real scoring move; rotate to improve; add second goal/tradeoff; coins/ruins/fallback/neighbor monster; actual season report; independent scoring move before graduation.
- [x] Gate progression on actual placement outcomes and goal inspection, not generic next clicks. Keep retry/back/exit and engine-backed fixtures.
- [x] Render four paper commissions on wooden guild board. Label two active and each future active season, show current/predicted reputation, exact contribution highlights, short example. No one-time claim mechanic.
- [x] Add score-source seasonal report and clear unbanked-vs-settled labels; responsive readable Chinese and fixed confirm controls retained.
- [x] Run fixture path/SSR tests and rules regression; no game/network changes.

## Task 3: Local seasonal album and integration
Files: collection.ts, CollectionGallery.tsx, collection.css, CartographersApp.tsx; tests/cartographers-collection.test.ts.
Interfaces: MapArchive {id,title,createdAt,mode,score,rating?,snapshots:{season,board}[]}; loadAlbum(store), recordSnapshot(store,id,season,board), collectGame(store,input), updateArchiveTitle(store,id,title). Store has getItem/setItem only; snapshots deeply copied. Gallery consumes records, onClose, onUpdate.
- [x] Write failing tests for snapshot immutability, dedup completion, capped records, malformed record isolation and old score history untouched.
- [x] Capture own map at each seasonEnd, keyed by solo seed or room matchId+seat. Save final archive once; old finished games only have available snapshot, never synthesize old seasons.
- [x] Add local album home entrance and responsive viewer with seasonal tabs, 3D appreciation and export. Existing history and solo resume keys remain unchanged.
- [x] Export current 3D canvas angle when ready; preserve 2D PNG fallback. No nicknames/keys in downloaded image.
- [x] Add causal goal synopsis on landing, replace remaining royal-edict-facing wording, retain all room safeguards.

## Task 4: Verification and publication
- [x] Independent rules/tutorial and 3D/storage review; repair actionable issues with focused regressions.
- [x] Run all Node/Python checks, TypeScript, four builds and offline verification, git diff --check.
- [x] Run real3-client room smoke if network-facing state changed; otherwise existing engine/network tests cover unchanged protocol.
- [x] Commit and push existing Pages branch, await workflow success and verify deployed asset fingerprint. Record browser verification limit.


