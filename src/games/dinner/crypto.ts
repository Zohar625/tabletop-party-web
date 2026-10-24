export interface SavedIdentity {
  publicKey: JsonWebKey;
  privateKey: JsonWebKey;
}
export interface Identity {
  id: string;
  publicKey: JsonWebKey;
  privateKey: CryptoKey;
  saved: SavedIdentity;
}
export interface Ciphertext {
  iv: string;
  data: string;
}
const text = new TextEncoder();
const base64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const bytes = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export async function fingerprint(key: JsonWebKey): Promise<string> {
  if (key.kty !== "EC" || key.crv !== "P-256" || !key.x || !key.y)
    throw Error("玩家身份格式错误");
  const hash = await crypto.subtle.digest(
    "SHA-256",
    text.encode(`${key.crv}:${key.x}:${key.y}`),
  );
  return Array.from(new Uint8Array(hash), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function createIdentity(): Promise<Identity> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"],
  );
  return restoreIdentity({
    publicKey: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateKey: await crypto.subtle.exportKey("jwk", pair.privateKey),
  });
}
export async function restoreIdentity(saved: SavedIdentity): Promise<Identity> {
  const id = await fingerprint(saved.publicKey);
  if ((await fingerprint(saved.privateKey)) !== id)
    throw Error("玩家身份存档不匹配");
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    saved.privateKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    ["deriveKey"],
  );
  return { id, publicKey: saved.publicKey, privateKey, saved };
}
export async function sharedKey(
  identity: Identity,
  peer: JsonWebKey,
): Promise<CryptoKey> {
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    peer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    identity.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(
  key: CryptoKey,
  value: unknown,
  context: string,
): Promise<Ciphertext> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: text.encode(context) },
    key,
    text.encode(JSON.stringify(value)),
  );
  return { iv: base64(iv), data: base64(new Uint8Array(cipher)) };
}
export async function unseal(
  key: CryptoKey,
  value: Ciphertext,
  context: string,
): Promise<unknown> {
  if (
    typeof value.iv !== "string" ||
    typeof value.data !== "string" ||
    value.data.length > 60000
  )
    throw Error("消息过大或损坏");
  const raw = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: bytes(value.iv),
      additionalData: text.encode(context),
    },
    key,
    bytes(value.data),
  );
  return JSON.parse(new TextDecoder().decode(raw));
}
