import test from "node:test";
import assert from "node:assert/strict";
import {
  createIdentity,
  restoreIdentity,
  sharedKey,
  seal,
  unseal,
  fingerprint,
} from "../src/games/dinner/crypto.ts";

test("只有房主和指定玩家可解密暗牌，修改密文拒绝", async () => {
  const host = await createIdentity(),
    guest = await createIdentity(),
    stranger = await createIdentity();
  const key = await sharedKey(host, guest.publicKey);
  const payload = await seal(key, { name: "牙膏饼干" }, "room:host:guest");
  assert.deepEqual(
    await unseal(
      await sharedKey(guest, host.publicKey),
      payload,
      "room:host:guest",
    ),
    { name: "牙膏饼干" },
  );
  assert(!JSON.stringify(payload).includes("牙膏"));
  await assert.rejects(
    unseal(
      await sharedKey(stranger, host.publicKey),
      payload,
      "room:host:guest",
    ),
  );
  await assert.rejects(unseal(key, payload, "other-room:host:guest"));
  await assert.rejects(
    unseal(
      key,
      { ...payload, data: payload.data.slice(0, -4) + "AAAA" },
      "room:host:guest",
    ),
  );
});

test("刷新恢复私钥保持同一玩家身份", async () => {
  const a = await createIdentity(),
    b = await createIdentity();
  const restored = await restoreIdentity(a.saved);
  assert.equal(restored.id, a.id);
  assert.equal(
    await fingerprint(restored.publicKey),
    await fingerprint(a.publicKey),
  );
  const encrypted = await seal(
    await sharedKey(b, a.publicKey),
    [1, 2, 3],
    "test",
  );
  assert.deepEqual(
    await unseal(await sharedKey(restored, b.publicKey), encrypted, "test"),
    [1, 2, 3],
  );
});
