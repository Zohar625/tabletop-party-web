# SCOUT Attention and Chat Implementation Plan

**Goal:** Make pending actors visible and add authenticated room chat with upbeat and frustrated quick phrases.
**Architecture:** Keep pure attention/phrase helpers separate from React. Extend existing encrypted room command and public snapshot with bounded chat history, without advancing game revisions. Add room-scoped collapsible chat UI and strengthen seat styles.

- [ ] Write failing room tests for chat order, authorship, unchanged revisions, duplicate retry, limits and restoration; implement chat snapshot/command handling.
- [ ] Write attention and phrase/SSR tests; implement status summary, seat badges and four quick-phrase categories with free text.
- [ ] Run focused and full tests, browser mobile/desktop interactions and real network smoke; independent review fixes.
- [ ] Build/package, commit/publish existing Pages branch, check deployed assets and UI, record limits.

Existing feature branch and checkout retained. No dependencies, old game changes, accounts or global installs. User added positive and negative phrase examples after the proposed turn-summary and independent-chat approach; incorporate directly.
