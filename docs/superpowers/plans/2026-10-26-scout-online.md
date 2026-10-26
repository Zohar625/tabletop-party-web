# SCOUT Online Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to execute task-by-task with scoped review.

**Goal:** Deliver original-rule 2–5-player SCOUT with private online hands, tactile card motion, teaching, and an existing-hub entry.

**Architecture:** Pure immutable engine and explicit per-viewer projections; isolated encrypted room reusing dinner crypto/MQTT, followed by React UI with state-derived commands and committed-event animation. Add a fifth independent Vite entry and deploy the existing Pages branch.

**Tech Stack:** Existing React19/TypeScript6/Vite8; SVG/CSS/Web Animations. No dependency installs.

## Global Constraints
- Approved spec: docs/superpowers/specs/2026-10-26-scout-online-design.md (user approved 2026-10-26).
- Original Oink rules, 2–5 real players, separate two-player rules. No AI, accounts/cloud, matchmaking, host migration or changes to older games.
- Original circus card art, deep navy stage, warm gold/cream; motion communicates origin/destination, reduced-motion supported.
- Files stay project-local on D. No C installs, no new dependencies.
- Reuse existing feature branch/check-out; source ownership per task. Never modify other games' engine/protocol.
- References are local D:/Codex-deep/scout-rules/oink-scout-rules.pdf and scout-two-player.pdf; first contains 2 scanned pages, rendered for parent inspection in .test-build/scout-rules-0.png and -1.png. Do not redistribute source scans in site.

## Rules decisions verified from printed Oink v1.1
- 45 unique pairs a/b for 1<=a<b<=10. Randomize each card's orientation as well as order. Three players remove all nine cards containing10 (36 total,12 each); two/four remove9/10 (44; two deals11 each with22 reserved, four11 each); five use45 (9 each).
- Start seat chosen by system at match start; each round starting marker moves one seat clockwise. Rounds=players, including2.
- Opening choice rotates the entire hand180deg: reverse order AND swap each card's top/bottom. Each player confirms once, then hand order fixed.
- Valid show is contiguous cards (single any location) with equal values or ascending/descending consecutive values. Strength lexicographic: count, equal-over-run for same count, minimum value; strictly greater wins. Single has a consistent kind and compares value only.
- Show captures ALL previous active cards for1point each, new group becomesactive owned by actor. Scout removes exactly an end card, choose orientation and insert in any gap. Other cards never reorder.
- In3–5, active owner receives1Scout chip, even if their last active card is taken; ownership unchanged while any remain. Empty active means next Show unrestricted. Everyone other than latest shower scouting without a newShow ends round immediately; latest shower does not pay remaining-hand penalty. Empty-hand Show ends immediately; newactive itself isn't captured/scored.
- In3–5 each player has one Scout&Show per round; consume on Scout then same actor mustShow. Reject combo if no legal show after insertion (no dead end). No secondScout or passing in pendingcombo.
- In2 each starts3Scoutchips, noScout&Show; spend1toScout, noownerreward, same actor continues untilShow. When actor has zerochips and nolegalShow roundends, latest shower avoids handpenalty. Remaining chips count1each. Round2deals reserved22, not first-roundcards.
- Score capturedcount+Scoutchips-handcount except unbeatable leader's penalty0. Cards in active don'tscore. Totals persist; ties shared.

### Task 1: Pure rules, private views, and behavioral tests
**Files:** create src/games/scout/types.ts, engine.ts, tests/scout-engine.test.ts; optional small focused data.ts.
**Interfaces (produce for later tasks):**
```ts
interface ScoutCard { id:string; top:number; bottom:number }
type ScoutAction = {type:'orient';flip:boolean}|{type:'show';start:number;count:number}|{type:'scout';side:'left'|'right';flip:boolean;insertIndex:number;combo:boolean}|{type:'next'};
createScout(players:{id:string;name:string}[], seed:string):ScoutState;
reduceScout(state:ScoutState, actorId:string, action:ScoutAction):ScoutState;
scoutView(state:ScoutState, viewerId:string):ScoutView;
classifySet(cards:ScoutCard[]):{count:number;kind:'single'|'run'|'same';min:number}|null;
canBeat(cards:ScoutCard[], active:ScoutCard[]|null):boolean;
hasLegalShow(hand:ScoutCard[], active:ScoutCard[]|null):boolean;
```
Public view fields must include matchId,phase('orienting'|'playing'|'roundEnd'|'finished'),round(1-based),totalRounds,starterId,turnId,active({ownerId,cards}|null),players,me,scoutsSinceShow,comboActorId(string|null),revision,eventSeq,events,history. Public players: id,name,handCount,orientationConfirmed,captured(number),scoutChips,scoutShowAvailable,total. `me:{id,hand:ScoutCard[],orientationConfirmed}`. State can contain private hand arrays, seed/reserve. Each player has actualhand and public counters.
Events: `{seq:number,kind:'deal'|'orient'|'show'|'scout'|'roundEnd',actorId:string,cards?:ScoutCard[],captured?:ScoutCard[],sourceOwnerId?:string,insertIndex?:number,flipped?:boolean}`. Use boundedrecent events (e.g. last12), monotonicseq. Deal/orient never include private cards. PublicScout event can identify taken publicly-known card, but only actor may receive insertIndex/flipped. Do not leak initial card IDs, dealorder, seed orreserve. Deep copy projections.
Round history: `{round,starterId,reason:'emptyHand'|'unbeaten'|'blocked',leaderId,lines:{id,name,captured,scoutChips,remainingPenalty,delta,total}[]}`. `next` authorized onlyfirstplayer/hostseat, resetsperroundfields and movesstarter. Rejectbadphase/nonfinite/outofrange/noninteger inputs; unchangedoriginal onallfailures.
- [ ] Write failing tests with literal fixturehands andscoreexpectations. Coverwholehand reversal, strictsetcomparison,contiguousselection,Scoutends/insert/flip,combo,allScoutstop,scoreexemption,two-playerreserve/continuation/block andcompletegames.
```ts
assert.equal(canBeat([{id:'a',top:4,bottom:9},{id:'b',top:5,bottom:8}], [{id:'c',top:3,bottom:7},{id:'d',top:3,bottom:6}]), false);
```
- [ ] Run newtest andobserveexpectedRED, implementimmutablelogic, runGREEN. Full rules are above; don't invent variants. Add privateview mutation/leak checks.
- [ ] Commit ownedfiles; write taskreport includingcommands/results, API deviations, exactrulesquestions. Parent reviews before nexttask.

### Task 2: Encrypted private-hand room
**Files:** create src/games/scout/room.ts, tests/scout-room.test.ts, scripts/verify-scout-online.ts. Do not edit dinner/cartographers transports.
**Consumes:** Task1 types,createScout/reduceScout/scoutView. Reuse ../dinner/crypto.ts and ../dinner/mqtt.ts with namespace `tabletop-scout`.
**Produces:** ScoutRoom with getSnapshot,subscribe,connect,stop,ready,startGame,act,rematch,kick,leave; exported createRoom(name,options),joinRoom(name,code,pin,options),restoreRoom(options),hasSavedRoom(options?),roomJoinGuard(snapshot,hasController),roomLink(code,pin). Follow exact existing dinner API contracts where possible; publish deviations inreport.
Snapshot mirrors dinner:matchId,code,hostId,meId,host,pin,status,warning,error,revision,peers,game:ScoutView|null,pending. Options store/transport/now/tickMs. Storage `tabletop.scout.room.v1`; playernamesdefault团长;max5;min2; sixdigitcodes; invitequery room/pin as existing.
- [ ] Write failing2client memorytransport test, waitingALLclientsonline+peers beforecommands. Assert secretsonlyrecipient,wireencrypted,restoreidentity,duplicate/stale/outofturnactions,unready/offlinecan'tstart,kick/leave,rematch/newmatchidentity.
- [ ] Adapt proven roomalgorithm in ownmodule; preserve collisionprobe,hostfingerprint,receipts,serialization,stalesavedidentityguards. Remove dinner-specific initialplacementstale exception; allScoutactions require currentrevision. `next` hostonly, rejoin resumes authoritativeprivateview,notredeal.
- [ ] Add3/5clientsmokeinmemory,realMQTTscript2clients includingactualorient/show/scout/refresh (noUItest backdoors).
- [ ] Run tests andtypecheck,commitownedfiles,reportinterfaces andcommands. No appUI yet.

### Task 3: Stage UI, card motion and independent teaching
**Files:** create src/games/scout/ScoutApp.tsx, ScoutTable.tsx, Card.tsx, Tutorial.tsx, ui-model.ts, scout.css; tests/scout-ui.test.ts; maysplitmotion.ts.
**Consumes:** Task1 publictypes/legality,Task2roomcontracts. Props ScoutTable `{game:ScoutView,actor:string,pending?:boolean,onAction:(a:ScoutAction)=>void,teaching?:boolean}`. Appdefaultmount via entry addedTask4.
- [ ] Add tests forcontinuousselectionmodel,selectionreset onlywhenactorhand/turnchanges,Scoutinsertpreviewpreservesorder,committedeventdedup and privatecardSSR. Testintro/roomstatus/handlabels andteachinggates.
- [ ] Implement darkcircuslanding,lobby6digitcode/invite/copy/prepare/hoststart,refreshrestorewithoutidentityreplacement,exitconfirmationandroomkeptwhenreturninghome. Neveroverwriteactiveidentitybyjoinlink. Showconnectionblockedstate clearly.
- [ ] Implement orientationpreview+confirm,contiguousselectionstart/end,legalitytext,Show,Scout3-stepwizard withends/orientation/gap+cancel/confirm,Scout&Showwithpendingphase,roundreceipt+hostnext,finaltotals+jointwinners+rematch. Doubleclick/pendingcan'tsendtwice. 2-playertokens/continuedturn explained.
- [ ] OriginalSVG/CSSdualnumbercards withbigcurrenttop,invertedbottom,distinctcardbacks. Handarea horizontallyscrollablewithinviewport,44pxcontrols,keyboardfocus. Actionsstayreachableonmobile. Nothing allows handreorder.
- [ ] Real committedmotion:dealstagger/ownflip,selectionlift,Show hand-to-stage,previousactive-to-score,Scoutedge-to-insertion+handreflow,wholehandrotation,chip-to-owner,roundreceipt. Use stableidsandFLIPorboundedflyingoverlay; eventseqbaselineonmount means no replay afterrestore; reducedmotion and backgroundfastforward; animation callbacksneverdispatch.
- [ ] Independent tutorial usesrealenginefixtures:orientation+order,contiguousrun,Scoutbridging,Showaftergapcloses,comboandscoring. Gateactualdecisions;no formalroom/savemutation. Cancel/retry/exitavailable.
- [ ] Run UI/SSR tests andtypecheck,commitownedfiles,reportcommands andbrowsertestremaining.

### Task 4: Hub, production entry, verification and publishing
**Files:** create scout/index.html,scout/main.tsx,vite.scout.config.ts; modify package.json(buildfifthentry),src/games/registry.ts,src/App.tsx(hubcardart/linkhandling),src/styles.css(ifnecessary),scripts/package-offline.mjs,scripts/verify-package.mjs,README.md; verificationdoc.
- [ ] AddindependentViteentry followingdinnerexample. Registryhref `./scout/index.html`; generatedofflinehubusespublicHTTPSscoutlink. Updateverifierwithrelativeassetschecks andrun existingallgamechecks.
- [ ] Execute fullNode/Python,TypeScriptandpackageoffline. Inspectsourceboundary olderenginesunchanged.
- [ ] Browser desktopand390pxrealinteraction:twoactualrooms/privatehands,orient/show/Scout/insertfirstmiddlelast,combo,motion,receipt,restore,teaching,keyboard/reducedmotion. ReadUIonly; do notuseevaluate toinjectstate. Localfixturesmaytestrarephasevisuals,explicitlyidentified.
- [ ] Independent wholechange review ofrules/security/UI;fixactionableP1/P2 andfocusedregressions. Run realMQTTsmoke.
- [ ] Commit/pushexistingPagesbranch;awaitCI;comparedeployedassetfingerprints andonlineUI. Saveproofscreenshotandrecordverificationlimits. Stopownedserversandkeepdelivertab.
