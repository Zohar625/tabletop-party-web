# Cartographers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add an illustrated Cartographers base-game experience with a guided tutorial, solo saves, and simultaneous multiplayer.

**Architecture:** Pure immutable engine and scoring, independent React entry, transport-backed authoritative host. Terrain art is SVG; tutorial shares placement helpers. Existing games retain their build entries.

**Tech Stack:** Existing React 19, TypeScript 6, Vite 8, Node test runner, native WebSocket MQTT.

## Global Constraints
- First release: base A map, base explore and ambush rules, all 16 score rules, solo rating.
- 2–6 multiplayer; shared deck and simultaneous submissions; monsters drawn on neighbor maps.
- Original illustrated UI; reduced motion; touch preview then confirmation; 11×11 map can zoom.
- No dependency installation; D drive project; existing GitHub Pages deployment.
- Browser automation currently unavailable: record visual verification limitation and do not invent screenshots.

## Task 1: Rules, fixtures and scoring
Files: src/games/cartographers/{types,data,scoring,engine}.ts; tests/cartographers-engine.test.ts.
Interfaces: createGame(players,seed,mode), reduceGame(state,actor,action), gameView(state), targetPlayer(state,actor), transformedShape(cells,rotation,mirrored), placementError(state,actor,placement), scoreBoard(board,goalId), soloRating(total,goals).
- [x] Write failing cases: four rotations preserve unique cells; invalid overlap does not mutate input; forest edge score counts only orthogonal edge; monster penalty deduplicates empty neighbors; solo rating subtracts goal baselines.
```ts
assert.equal(scoreBoard(board,"sentinel"), 1);
assert.throws(()=>reduceGame(s,"a",{type:"place",placement:invalid}));
assert.deepEqual(s,before);
```
- [x] Run node --experimental-strip-types --test tests/cartographers-engine.test.ts; confirm failure before implementation.
- [x] Implement base data with documented official source, explicit scoring helpers and immutable phase progression. Ruins persists through ambush; monster single-player placement scans fixed orientation; multiplayer targets neighbor by direction; fallbacks apply only when normal placement impossible.
- [x] Run focused tests; review fixtures and actual card counts/shape data; record intentional differences, if any.

## Task 2: Map art, UI and tutorial
Files: src/games/cartographers/{CartographersApp.tsx,cartographers.css,TerrainArt.tsx,Tutorial.tsx}; tests/cartographers-ui.test.ts.
Consumes Task1 interfaces. Produces default CartographersApp with own entry.
- [x] Write semantic rendering tests for terrain glyph differences, tutorial controls, and game controls without secret deck output.
- [x] Build detailed terrain SVG glyphs and reusable full-map preview; use layered parchment surfaces, forest/ochre/blue palettes and restrained fall/winter treatments.
- [x] Add landing menu, solo continue/history, online room panel, score breakdown, goals highlight, choice cards, rotation/mirror, hover/touch preview+confirm, zoom controls and accessible keyboard navigation.
- [x] Add fixed interactive tutorial scenes with real placement validation and guided goal feedback; back/retry/exit, no permanent game edits.
- [x] Add card arrival, ink placement, mountain coin, monster and season score effects; respect prefers-reduced-motion; never delay sync for animations.
- [x] Run TS check, SSR tests and layout code audit. Browser unavailable: mark verification limitation.

## Task 3: Network session and persistence
Files: src/games/cartographers/{room.ts,session.ts}; tests/cartographers-room.test.ts.
Consumes reduceGame and gameView. Exports room create/join/restore plus stable snapshots and connect/stop/ready/start/act API.
- [x] Write failed tests for three independent simulated clients: join, ready, shared targets, simultaneous placement, duplicate replay, stale turn rejection, restore.
- [x] Host keeps private deck, clients receive public view only. Commands include turn and player ID, unique request ID and receipt; same-turn independent submissions remain valid after another seat submits.
- [x] Reuse existing MQTT transport with distinct map topic prefix. Pin host identity in links and use existing ECDH/AES helpers, never send unencrypted full state. Persist host state with stale-tab write guard; guests store credentials only.
- [x] Pause live actions while required players disconnected. Lobby limits 2–6, host may kick before start; do not discard old sessions merely because a different tab opens.
- [x] Run targeted and full Node suite; real network smoke test.

## Task 4: Integration and delivery
Files: cartographers/index.html, vite.cartographers.config.ts, src/games/registry.ts, package.json, scripts/{package-offline,verify-package}.mjs, README.md.
- [x] Add isolated build entry and illustrated lobby card; offline lobby links map online if standalone inline export unsupported.
- [x] Run all Node/Python checks and npm run package:offline, git diff --check.
- [x] Independent review of spec compliance and correctness; repair findings with targeted tests.
- [ ] Commit and push to existing branch, await Pages workflow, verify served resource names and public entry. Document unavailable interactive browser QA clearly.

## Execution evidence
- 117 Node tests and11Python tests pass; TS+4buildentries+offlinepackaging pass.
- Engine andUI independentreviews completed; findings repaired with regressions.
- Real3WebSocketclients passed simultaneousplacements, deckprivacy andguest/hostrestore.
- Browserautomation unavailable, no interactivephoneQA orPNGdownload claim.
