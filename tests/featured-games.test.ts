import test from "node:test";
import assert from "node:assert/strict";
import {
  featuredGames,
  nextFeatured,
} from "../src/components/featured-games.ts";
import { games } from "../src/games/registry.ts";
test("every available lobby game has its own complete feature and original destination", () => {
  assert.deepEqual(
    featuredGames.map((g) => g.id),
    games.map((g) => g.id),
  );
  for (const game of featuredGames) {
    assert.equal(game.headline.length, 2);
    assert(game.description && game.players && game.duration);
    assert.equal(game.href, games.find((g) => g.id === game.id)?.href);
  }
  assert.equal(
    new Set(featuredGames.map((g) => g.headline.join())).size,
    games.length,
  );
});
test("previous and next wrap through the full shelf without skipping a game", () => {
  assert.equal(nextFeatured(0, -1), featuredGames.length - 1);
  assert.equal(nextFeatured(featuredGames.length - 1, 1), 0);
  let index = 0;
  const visited = new Set<number>();
  for (let i = 0; i < featuredGames.length; i++) {
    visited.add(index);
    index = nextFeatured(index, 1);
  }
  assert.equal(visited.size, games.length);
});
