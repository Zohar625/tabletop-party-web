import { createScout, scoutView, reduceScout } from "./engine.ts";
import type { ScoutAction, ScoutState, ScoutView } from "./types.ts";
import { cleanChatText } from "./chat-model.ts";
import type { ChatMessage } from "./chat-model.ts";
import {
  automaticAction,
  makeTurnClock,
  readTurnClock,
  validTurnLimit,
} from "./turn-clock.ts";
import type { TurnClock, TimeoutNotice } from "./turn-clock.ts";
import {
  createIdentity,
  restoreIdentity,
  fingerprint,
  sharedKey,
  seal,
  unseal,
} from "../dinner/crypto.ts";
import type { Identity, SavedIdentity, Ciphertext } from "../dinner/crypto.ts";
import { MqttTransport } from "../dinner/mqtt.ts";
import type { RoomTransport } from "../dinner/mqtt.ts";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
export interface RoomOptions {
  code?: string;
  store?: Store;
  transport?: (code: string) => RoomTransport;
  now?: () => number;
  tickMs?: number;
}
interface Peer {
  id: string;
  name: string;
  ready: boolean;
  publicKey: JsonWebKey;
}
interface Receipt {
  id: string;
  error: string;
}
interface SavedRoom {
  turnLimitSeconds?: number;
  turnClock?: TurnClock | null;
  clockSeq?: number;
  timeoutNotice?: TimeoutNotice | null;
  version: 1;
  admitted?: boolean;
  chat?: ChatMessage[];
  chatSeq?: number;
  matchId?: string;
  claimed?: boolean;
  code: string;
  name: string;
  identity: SavedIdentity;
  hostId: string;
  pin: string;
  peers: Peer[];
  game: ScoutState | null;
  revision: number;
  blocked: string[];
  playing: boolean;
  receipts: Record<string, Receipt[]>;
}
export interface RoomSnapshot {
  turnLimitSeconds: number;
  turnClock: TurnClock | null;
  clockSeq: number;
  clockOffsetMs: number;
  timeoutNotice: TimeoutNotice | null;
  chat: ChatMessage[];
  matchId: string;
  code: string;
  hostId: string;
  meId: string;
  host: boolean;
  pin: string;
  status: "connecting" | "online" | "waiting" | "offline" | "closed";
  warning: string;
  error: string;
  revision: number;
  peers: { id: string; name: string; ready: boolean; online: boolean }[];
  game: ScoutView | null;
  pending: boolean;
}
type Command =
  | { type: "turnLimit"; seconds: number }
  | { type: "chat"; text: string }
  | { type: "join" | "ping" | "start" | "rematch" | "leave" }
  | { type: "ready"; value: boolean }
  | { type: "action"; action: ScoutAction }
  | { type: "kick"; playerId: string };
interface Request {
  kind: "request";
  id: string;
  version: number;
  orientationRound?: number;
  orientationMatch?: string;
  name: string;
  command: Command;
}
interface Frame {
  v: 1;
  type: "cipher";
  from: string;
  to: string;
  publicKey: JsonWebKey;
  body: Ciphertext;
}
const SAVE = "tabletop.scout.room.v1";
const memory = new Map<string, string>();
const fallback: Store = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => {
    memory.set(k, v);
  },
  removeItem: (k) => {
    memory.delete(k);
  },
};
function storage(): Store {
  try {
    return localStorage;
  } catch {
    return fallback;
  }
}
const nameOf = (name: string) =>
  name
    .trim()
    .replace(/[\u0000-\u001f]/g, "")
    .slice(0, 16) || "团长";
const validCode = (code: string) => /^[0-9]{6}$/.test(code);
const codeOf = () => {
  // Rejection sampling avoids modulo bias in the six-digit room space.
  const limit = Math.floor(2 ** 32 / 1_000_000) * 1_000_000;
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while (value[0]! >= limit);
  return String(value[0]! % 1_000_000).padStart(6, "0");
};

export class ScoutRoom {
  private saved: SavedRoom;
  private identity: Identity;
  private store: Store;
  private transport: RoomTransport;
  private now: () => number;
  private tickMs: number;
  private timer?: ReturnType<typeof setInterval>;
  private listeners = new Set<() => void>();
  private snapshot: RoomSnapshot;
  private keys = new Map<string, Promise<CryptoKey>>();
  private seen = new Map<string, number>();
  private hostKey?: JsonWebKey;
  private pending?: Request;
  private acknowledgedLeaveId = "";
  private tail: Promise<unknown> = Promise.resolve();
  private stopped = true;
  private connected = false;
  private connecting = false;
  private clockOffsetMs?: number;
  private reconnectAt = 0;
  private warning = "";
  private error = "";
  private hostSeen = 0;
  private probing = false;
  private lastWritten?: string;

  constructor(
    saved: SavedRoom,
    identity: Identity,
    options: RoomOptions = {},
    restoredRaw?: string,
  ) {
    this.saved = saved;
    this.identity = identity;
    this.store = options.store ?? storage();
    this.transport = (
      options.transport ?? ((code) => new MqttTransport(code, "tabletop-scout"))
    )(saved.code);
    this.now = options.now ?? Date.now;
    this.tickMs = options.tickMs ?? 2000;
    this.snapshot = {
      turnLimitSeconds: saved.turnLimitSeconds ?? 0,
      turnClock: readTurnClock(saved.turnClock),
      clockSeq: saved.clockSeq ?? 0,
      clockOffsetMs: 0,
      timeoutNotice: saved.timeoutNotice ?? null,
      chat: structuredClone(saved.chat ?? []),
      matchId: saved.matchId ?? "",
      code: saved.code,
      hostId: saved.hostId,
      meId: identity.id,
      host: this.isHost,
      pin: saved.pin,
      status: "connecting",
      warning: "",
      error: "",
      revision: saved.revision,
      peers: [],
      game: null,
      pending: false,
    };
    this.transport.onMessage = (value) => {
      void this.enqueue(() => this.receive(value)).catch(() => {});
    };
    this.transport.onOffline = () => {
      if (!this.stopped) {
        this.connected = false;
        this.emit("offline");
      }
    };
    if (restoredRaw === undefined) this.persist();
    else this.lastWritten = restoredRaw;
    if (this.isHost) this.updateHost();
  }
  private get isHost() {
    return this.identity.id === this.saved.hostId;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private enqueue<T>(task: () => Promise<T> | T): Promise<T> {
    const result = this.tail.then(task);
    this.tail = result.catch(() => {});
    return result;
  }
  private persist() {
    this.assertCurrent();
    try {
      const raw = JSON.stringify(this.saved);
      this.store.setItem(SAVE, raw);
      this.lastWritten = raw;
    } catch {
      this.warning = "本设备无法保存，刷新后可能无法找回座位。请保持页面打开。";
    }
    if (this.store === fallback)
      this.warning = "本设备无法保存，刷新后可能无法找回座位。请保持页面打开。";
  }
  private assertCurrent() {
    if (this.lastWritten === undefined) return;
    let raw: string | null;
    try {
      raw = this.store.getItem(SAVE);
    } catch {
      this.warning = "本机记录暂时无法读取，请只在这一个页面继续。";
      return;
    }
    if (raw !== this.lastWritten) {
      this.error =
        "本机房间记录已变化，可能已在其他页面开启新房间，请刷新后继续。";
      this.stop();
      this.emit("closed");
      throw Error(this.error);
    }
  }
  private emit(status?: RoomSnapshot["status"]) {
    this.snapshot = {
      ...this.snapshot,
      matchId: this.isHost ? (this.saved.matchId ?? "") : this.snapshot.matchId,
      status: status ?? this.snapshot.status,
      warning: this.warning,
      error: this.error,
      pending: !!this.pending,
      chat: this.isHost
        ? structuredClone(this.saved.chat ?? [])
        : this.snapshot.chat,
    };
    this.listeners.forEach((listener) => listener());
  }
  private online(id: string) {
    return id === this.identity.id
      ? this.connected
      : this.now() - (this.seen.get(id) ?? 0) < 10000;
  }
  private publicPeers() {
    return this.saved.peers.map((p) => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      online: this.online(p.id),
    }));
  }
  private updateHost() {
    this.snapshot = {
      ...this.snapshot,
      turnLimitSeconds: this.saved.turnLimitSeconds ?? 0,
      turnClock: readTurnClock(this.saved.turnClock),
      clockSeq: this.saved.clockSeq ?? 0,
      clockOffsetMs: 0,
      timeoutNotice: this.saved.timeoutNotice ?? null,
      revision: this.saved.revision,
      peers: this.publicPeers(),
      game: this.saved.game
        ? scoutView(this.saved.game, this.identity.id)
        : null,
    };
    this.emit();
  }
  private key(id: string, publicKey: JsonWebKey) {
    if (!this.keys.has(id))
      this.keys.set(id, sharedKey(this.identity, publicKey));
    return this.keys.get(id)!;
  }
  private async sendTo(id: string, publicKey: JsonWebKey, value: unknown) {
    const from = this.identity.id;
    const body = await seal(
      await this.key(id, publicKey),
      value,
      `${this.saved.code}:${from}:${id}`,
    );
    if (!this.stopped && this.connected)
      this.transport.send({
        v: 1,
        type: "cipher",
        from,
        to: id,
        publicKey: this.identity.publicKey,
        body,
      } satisfies Frame);
  }
  private async publish() {
    if (!this.isHost || !this.connected || this.stopped || this.probing) return;
    this.assertCurrent();
    this.transport.send({
      v: 1,
      type: "host",
      publicKey: this.identity.publicKey,
    });
    this.updateHost();
    for (const p of this.saved.peers)
      if (p.id !== this.identity.id) {
        await this.sendTo(p.id, p.publicKey, {
          kind: "snapshot",
          turnLimitSeconds: this.saved.turnLimitSeconds ?? 0,
          turnClock: this.saved.turnClock ?? null,
          clockSeq: this.saved.clockSeq ?? 0,
          hostNow: this.now(),
          timeoutNotice: this.saved.timeoutNotice ?? null,
          matchId: this.saved.matchId ?? "",
          revision: this.saved.revision,
          peers: this.publicPeers(),
          game: this.saved.game ? scoutView(this.saved.game, p.id) : null,
          receipts: this.saved.receipts[p.id] ?? [],
          chat: this.saved.chat ?? [],
        });
      }
  }
  async connect() {
    if (!this.stopped) return;
    this.stopped = false;
    this.timer = setInterval(() => {
      void this.pulse().catch(() => {});
    }, this.tickMs);
    return this.open();
  }
  private async open() {
    if (this.connecting || this.stopped) return;
    this.connecting = true;
    this.clockOffsetMs = undefined;
    this.emit("connecting");
    try {
      await this.transport.connect();
      if (this.stopped) {
        this.transport.close();
        return;
      }
      this.connected = true;
      this.error = "";
      if (this.isHost && this.saved.claimed === false) {
        this.probing = true;
        this.transport.send({ v: 1, type: "probe" });
        await new Promise((resolve) => setTimeout(resolve, 1200));
        this.probing = false;
        if (this.stopped) return;
        this.assertCurrent();
        this.saved.claimed = true;
        this.persist();
      }
      this.emit(this.isHost ? "online" : "waiting");
      await this.enqueue(() =>
        this.isHost
          ? this.publish()
          : this.sendRequest(this.makeRequest({ type: "join" })),
      );
    } catch (error) {
      this.connected = false;
      this.error =
        error instanceof Error ? error.message : "暂时无法连接，请稍后重试。";
      this.reconnectAt = this.now() + 3000;
      this.emit("offline");
      throw error;
    } finally {
      this.connecting = false;
    }
  }
  private async pulse() {
    if (this.stopped) return;
    if (!this.connected) {
      if (!this.connecting && this.now() >= this.reconnectAt) await this.open();
      return;
    }
    await this.enqueue(async () => {
      if (this.isHost) {
        this.advanceTurnClock();
        await this.publish();
      } else {
        if (this.now() - this.hostSeen > 10000) this.emit("waiting");
        await this.sendRequest(
          this.pending ??
            this.makeRequest({
              type: this.snapshot.peers.some((p) => p.id === this.identity.id)
                ? "ping"
                : "join",
            }),
        );
      }
    });
  }
  private makeRequest(command: Command): Request {
    return {
      kind: "request",
      id: crypto.randomUUID(),
      version: this.snapshot.revision,
      orientationRound:
        this.snapshot.game?.phase === "orienting"
          ? this.snapshot.game.round
          : undefined,
      orientationMatch: this.snapshot.matchId,
      name: this.saved.name,
      command,
    };
  }
  private resetTurnClock() {
    this.saved.turnClock = makeTurnClock(
      this.saved.game,
      this.saved.turnLimitSeconds ?? 0,
      this.now(),
    );
    this.saved.clockSeq = (this.saved.clockSeq ?? 0) + 1;
    this.saved.timeoutNotice = null;
  }
  private advanceTurnClock() {
    if (!this.isHost || !this.connected || this.stopped || this.probing) return;
    const clock = this.saved.turnClock;
    const game = this.saved.game;
    if (
      !clock ||
      !game ||
      game.phase !== "playing" ||
      this.now() < clock.deadline
    )
      return;
    this.assertCurrent();
    const name =
      game.players.find((p) => p.id === clock.actorId)?.name ?? "团员";
    if (clock.stage === 0) {
      this.saved.turnClock = {
        ...clock,
        stage: 1,
        deadline: this.now() + clock.seconds * 1000,
      };
      this.saved.clockSeq = (this.saved.clockSeq ?? 0) + 1;
      this.saved.timeoutNotice = {
        id: `${clock.key}:warning`,
        text: `${name}首次超时，已重新计时；再次超时将自动操作。`,
      };
    } else {
      const action = automaticAction(game);
      if (!action) {
        this.saved.turnClock = null;
        this.saved.clockSeq = (this.saved.clockSeq ?? 0) + 1;
        this.saved.timeoutNotice = {
          id: `${clock.key}:unavailable`,
          text: "自动操作暂不可用，请房主检查桌面。",
        };
      } else {
        this.saved.game = reduceScout(game, clock.actorId, action);
        this.saved.playing = this.saved.game.phase !== "finished";
        this.saved.revision++;
        this.resetTurnClock();
        this.saved.timeoutNotice = {
          id: `${clock.key}:auto`,
          text: `${name}连续两次超时，系统已自动${action.type === "show" ? `演出${action.count}张牌` : "普通挖角"}。`,
        };
      }
    }
    this.persist();
    this.updateHost();
  }
  private async sendRequest(request: Request) {
    if (this.hostKey)
      await this.sendTo(this.saved.hostId, this.hostKey, request);
  }
  private async receive(value: unknown) {
    if (this.stopped || !value || typeof value !== "object") return;
    const frame = value as Frame & { type: string };
    if (frame.v !== 1) return;
    if (String(frame.type) === "probe") {
      if (this.isHost && !this.probing) await this.publish();
      return;
    }
    if (String(frame.type) === "host") {
      const id = await fingerprint(frame.publicKey);
      if (this.isHost) {
        if (id === this.identity.id) return;
        // Only an unclaimed new room may be rejected by a public announcement.
        // An established room never stops because of another publisher's clock
        // or unsigned advertisement on the public topic.
        if (this.probing) {
          this.error = "这个房间码已被使用，请退出后重新创建房间。";
          this.stop();
          this.emit("closed");
        }
        return;
      }
      if (this.saved.pin && this.saved.pin !== id) {
        this.error = "房主身份不匹配，请使用朋友分享的完整链接。";
        this.emit("waiting");
        return;
      }
      if (this.saved.hostId && this.saved.hostId !== id) return;
      const discoveredHost = !this.hostKey;
      this.saved.hostId = id;
      this.saved.pin = id;
      this.hostKey = frame.publicKey;
      this.snapshot = { ...this.snapshot, hostId: id, pin: id };
      this.persist();
      // A public host advertisement is discovery, not a request to rejoin.
      // Replying to every advertisement creates join -> publish -> join loops;
      // the regular pulse already retries pending commands and recovers packets.
      if (discoveredHost)
        await this.sendRequest(
          this.pending ?? this.makeRequest({ type: "join" }),
        );
      return;
    }
    if (
      frame.type !== "cipher" ||
      frame.to !== this.identity.id ||
      typeof frame.from !== "string"
    )
      return;
    if (!this.isHost && frame.from !== this.saved.hostId) return;
    if ((await fingerprint(frame.publicKey)) !== frame.from) return;
    const payload = (await unseal(
      await this.key(frame.from, frame.publicKey),
      frame.body,
      `${this.saved.code}:${frame.from}:${frame.to}`,
    )) as Record<string, any>;
    if (this.isHost) {
      if (
        payload.kind !== "request" ||
        typeof payload.id !== "string" ||
        payload.id.length > 80 ||
        !payload.command
      )
        return;
      await this.handle(
        frame.from,
        frame.publicKey,
        payload as unknown as Request,
      );
    } else if (payload.kind === "snapshot") {
      if (
        !Number.isInteger(payload.revision) ||
        payload.revision < this.snapshot.revision ||
        !Array.isArray(payload.peers)
      )
        return;
      this.hostSeen = this.now();
      this.snapshot = {
        ...this.snapshot,
        matchId: typeof payload.matchId === "string" ? payload.matchId : "",
        revision: payload.revision,
        peers: payload.peers,
        game: payload.game,
        chat:
          Array.isArray(payload.chat) &&
          (payload.chat.at(-1)?.seq ?? 0) >=
            (this.snapshot.chat.at(-1)?.seq ?? 0)
            ? payload.chat.slice(-50)
            : this.snapshot.chat,
      };
      if (
        Number.isInteger(payload.clockSeq) &&
        payload.clockSeq >= this.snapshot.clockSeq &&
        validTurnLimit(payload.turnLimitSeconds)
      ) {
        if (Number.isFinite(payload.hostNow)) {
          const sample = this.now() - payload.hostNow;
          this.clockOffsetMs =
            this.clockOffsetMs === undefined
              ? sample
              : Math.min(this.clockOffsetMs, sample);
        }
        this.snapshot = {
          ...this.snapshot,
          turnLimitSeconds: payload.turnLimitSeconds,
          turnClock: readTurnClock(payload.turnClock),
          clockSeq: payload.clockSeq,
          clockOffsetMs: this.clockOffsetMs ?? this.snapshot.clockOffsetMs,
          timeoutNotice:
            payload.timeoutNotice &&
            typeof payload.timeoutNotice.id === "string" &&
            typeof payload.timeoutNotice.text === "string"
              ? payload.timeoutNotice
              : null,
        };
        this.saved.turnLimitSeconds = this.snapshot.turnLimitSeconds;
        this.saved.turnClock = this.snapshot.turnClock;
        this.saved.clockSeq = this.snapshot.clockSeq;
        this.saved.timeoutNotice = this.snapshot.timeoutNotice;
      }
      this.saved.playing = !!payload.game && payload.game.phase !== "finished";
      this.saved.admitted = payload.peers.some(
        (p: { id: string }) => p.id === this.identity.id,
      );
      this.persist();
      const receipt = (payload.receipts as Receipt[]).find(
        (r) => r.id === this.pending?.id,
      );
      if (receipt) {
        this.error = receipt.error;
        this.pending = undefined;
      }
      this.emit("online");
    } else if (
      payload.kind === "left" &&
      this.pending?.command.type === "leave" &&
      payload.requestId === this.pending.id
    ) {
      this.acknowledgedLeaveId = this.pending.id;
      this.pending = undefined;
      this.error = "";
      this.stop();
      this.emit("closed");
    } else if (payload.kind === "denied" || payload.kind === "closed") {
      this.error = String(payload.message);
      this.stop();
      this.emit("closed");
    }
  }
  private async handle(id: string, publicKey: JsonWebKey, request: Request) {
    this.assertCurrent();
    const command = request.command;
    const peer = this.saved.peers.find((p) => p.id === id);
    if (command.type === "join") {
      if (!peer) {
        if (
          this.saved.game ||
          this.saved.peers.length >= 5 ||
          this.saved.blocked.includes(id)
        ) {
          await this.sendTo(id, publicKey, {
            kind: "denied",
            message: this.saved.game
              ? "这桌已经开始，请等下一桌。"
              : "房间已满或暂时无法加入。",
          });
          return;
        }
        this.saved.peers.push({
          id,
          publicKey,
          name: nameOf(request.name),
          ready: false,
        });
        this.saved.revision++;
        this.persist();
      }
      this.seen.set(id, this.now());
      await this.publish();
      return;
    }
    if (!peer) {
      // A successful leave removes the peer before publication. Its original
      // encrypted request can still retry a lost acknowledgement safely.
      if (
        command.type === "leave" &&
        this.saved.blocked.includes(id) &&
        this.saved.receipts[id]?.some(
          (receipt) => receipt.id === request.id && !receipt.error,
        )
      )
        await this.sendTo(id, publicKey, {
          kind: "left",
          requestId: request.id,
        });
      return;
    }
    this.seen.set(id, this.now());
    if (command.type === "ping") return;
    const receipts = this.saved.receipts[id] ?? [];
    if (receipts.some((r) => r.id === request.id)) {
      await this.publish();
      return;
    }
    let error = "";
    try {
      const sameOrientationRound =
        command.type === "action" &&
        command.action?.type === "orient" &&
        this.saved.game?.phase === "orienting" &&
        request.orientationRound === this.saved.game.round &&
        request.orientationMatch === (this.saved.matchId ?? "") &&
        Number.isInteger(request.version) &&
        request.version >= 0 &&
        request.version <= this.saved.revision &&
        this.saved.game.players.some(
          (p) => p.id === id && !p.orientationConfirmed,
        );
      if (
        command.type !== "ready" &&
        command.type !== "chat" &&
        !sameOrientationRound &&
        request.version !== this.saved.revision
      )
        throw Error("桌面已更新，请重新选择。");
      if (command.type === "chat") {
        const text = cleanChatText(command.text);
        const history = this.saved.chat ?? [];
        if (!history.some((m) => m.id === request.id)) {
          const previous = [...history]
            .reverse()
            .find((m) => m.authorId === id);
          if (previous && this.now() - previous.sentAt < 900)
            throw Error("消息太频繁，稍等一下再发。");
          const seq = (this.saved.chatSeq ?? history.at(-1)?.seq ?? 0) + 1;
          this.saved.chatSeq = seq;
          this.saved.chat = [
            ...history,
            {
              id: request.id,
              seq,
              authorId: id,
              name: peer.name,
              text,
              sentAt: this.now(),
            },
          ].slice(-50);
        }
      } else {
        this.apply(id, command);
        this.saved.revision++;
        if (
          command.type === "action" ||
          command.type === "start" ||
          command.type === "rematch"
        )
          this.resetTurnClock();
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "操作未生效，请重试。";
    }
    this.saved.receipts[id] = [...receipts, { id: request.id, error }].slice(
      -20,
    );
    this.persist();
    this.updateHost();
    // Confirm only after the authoritative roster and receipt are saved; normal
    // snapshots intentionally no longer include the permanently departed peer.
    if (!error && command.type === "leave")
      await this.sendTo(id, publicKey, { kind: "left", requestId: request.id });
    await this.publish();
    if (id === this.identity.id && error) throw Error(error);
  }
  private apply(id: string, command: Command) {
    if (command.type === "turnLimit") {
      if (id !== this.saved.hostId) throw Error("只有房主可以设置出牌时长。");
      if (!validTurnLimit(command.seconds))
        throw Error("每段时长应为5–300秒，或选择不限时。");
      this.saved.turnLimitSeconds = command.seconds;
      this.resetTurnClock();
    } else if (command.type === "ready") {
      if (this.saved.game || typeof command.value !== "boolean")
        throw Error("已经开桌，无法更改准备状态。");
      this.saved.peers.find((p) => p.id === id)!.ready = command.value;
    } else if (command.type === "start" || command.type === "rematch") {
      if (id !== this.saved.hostId) throw Error("请由房主开桌。");
      if (
        command.type === "start"
          ? !!this.saved.game
          : this.saved.game?.phase !== "finished"
      )
        throw Error("当前无法重新开桌。");
      if (
        this.saved.peers.length < 2 ||
        this.saved.peers.some((p) => !this.online(p.id) || !p.ready)
      )
        throw Error("需要2–5位玩家全部在线并准备好。");
      this.saved.game = createScout(
        this.saved.peers.map((p) => ({ id: p.id, name: p.name })),
        crypto.randomUUID(),
      );
      this.saved.matchId = crypto.randomUUID();
      this.saved.game.matchId = this.saved.matchId;
      this.saved.playing = true;
    } else if (command.type === "action") {
      if (!this.saved.game) throw Error("请先开桌。");
      if (command.action?.type === "next" && id !== this.saved.hostId)
        throw Error("只有房主可以开始下一轮。");
      this.saved.game = reduceScout(this.saved.game, id, command.action);
      this.saved.playing = this.saved.game.phase !== "finished";
    } else if (command.type === "kick" || command.type === "leave") {
      if (this.saved.game && this.saved.game.phase !== "finished")
        throw Error("对局中请保留座位，等待玩家重连。");
      const target = command.type === "kick" ? command.playerId : id;
      if (command.type === "kick" && id !== this.saved.hostId)
        throw Error("只有房主可以移出玩家。");
      if (target === this.saved.hostId) throw Error("房主离开会结束房间。");
      const peer = this.saved.peers.find((p) => p.id === target);
      if (!peer) throw Error("玩家已离桌。");
      this.saved.peers = this.saved.peers.filter((p) => p.id !== target);
      this.saved.blocked.push(target);
      if (command.type === "kick")
        void this.sendTo(target, peer.publicKey, {
          kind: "denied",
          message: "你已离开这一桌，可以重新创建房间。",
        });
    } else throw Error("不支持的操作。");
  }
  private async request(command: Command, request = this.makeRequest(command)) {
    this.assertCurrent();
    if (
      !this.connected ||
      this.stopped ||
      (!this.isHost && this.snapshot.status !== "online")
    )
      throw Error("正在等连接恢复，请稍候。");
    if (this.pending) throw Error("上一操作正在确认，请稍候。");
    this.error = "";
    if (this.isHost)
      return this.enqueue(() =>
        this.handle(this.identity.id, this.identity.publicKey, request),
      );
    this.pending = request;
    this.emit();
    await this.enqueue(() => this.sendRequest(request));
  }
  ready(value: boolean) {
    return this.request({ type: "ready", value });
  }
  async chat(text: string) {
    const command: Command = { type: "chat", text: cleanChatText(text) },
      request = this.makeRequest(command);
    await this.request(command, request);
    if (this.isHost) return;
    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      let unsubscribe = () => {};
      const check = () => {
        if (
          this.pending?.id === request.id &&
          this.snapshot.status === "online"
        )
          return;
        if (timer) clearTimeout(timer);
        unsubscribe();
        if (this.pending?.id === request.id)
          reject(Error("聊天尚未确认，请等待连接恢复。"));
        else if (this.error) reject(Error(this.error));
        else resolve();
      };
      unsubscribe = this.subscribe(check);
      timer = setTimeout(() => {
        unsubscribe();
        reject(Error("消息尚未收到房主确认，正在等待同步。"));
      }, 8000);
      check();
    });
  }
  startGame() {
    return this.request({ type: "start" });
  }
  setTurnLimit(seconds: number) {
    return this.request({ type: "turnLimit", seconds });
  }
  act(action: ScoutAction) {
    return this.request({ type: "action", action });
  }
  rematch() {
    return this.request({ type: "rematch" });
  }
  kick(playerId: string) {
    return this.request({ type: "kick", playerId });
  }
  stop() {
    this.stopped = true;
    this.connected = false;
    clearInterval(this.timer);
    this.transport.close();
    this.emit("offline");
  }
  private waitForLeave(requestId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const finish = (error?: Error) => {
        clearTimeout(timer);
        unsubscribe();
        if (error) reject(error);
        else resolve();
      };
      const check = () => {
        if (this.acknowledgedLeaveId === requestId) finish();
        else if (
          !this.pending ||
          this.pending.id !== requestId ||
          !this.connected ||
          this.snapshot.status === "closed"
        )
          finish(
            Error(
              this.error || "离席未获房主确认，座位信息已保留，可刷新恢复。",
            ),
          );
      };
      const unsubscribe = this.subscribe(check);
      const timer = setTimeout(
        () =>
          finish(
            Error("离席尚未收到房主确认，座位信息已保留，可重试或刷新恢复。"),
          ),
        5000,
      );
      check();
    });
  }
  async forceLeave() {
    await this.enqueue(() => {
      if (this.isHost) throw Error("房主请使用收桌结束房间。");
      if (this.store.getItem(SAVE) !== this.lastWritten)
        throw Error("本机已有新的房间记录，请刷新后继续。");
      this.stop();
      this.store.removeItem(SAVE);
      this.pending = undefined;
      this.emit("closed");
    });
  }
  canCancelJoin() {
    return (
      !this.isHost &&
      !this.saved.admitted &&
      !this.saved.playing &&
      !this.snapshot.game &&
      this.snapshot.status !== "online"
    );
  }
  async cancelJoin() {
    await this.enqueue(() => {
      if (!this.canCancelJoin())
        throw Error("已入桌的座位请正常离席或保留后恢复。");
      if (this.store.getItem(SAVE) !== this.lastWritten)
        throw Error("本机已有新的房间记录，请刷新。");
      this.stop();
      this.store.removeItem(SAVE);
      this.emit("closed");
    });
  }
  discardClosed() {
    if (this.snapshot.status !== "closed")
      throw Error("房间尚未结束，请先正常离桌。");
    if (this.store.getItem(SAVE) !== this.lastWritten)
      throw Error("本机已有新的房间记录，请刷新后继续。");
    this.store.removeItem(SAVE);
  }
  async leave() {
    this.assertCurrent();
    // Guests retain their seats during a live match; stop() is temporary.
    // The host can explicitly close the entire table in any phase.
    if (
      !this.isHost &&
      (this.saved.playing ||
        (this.snapshot.game && this.snapshot.game.phase !== "finished"))
    )
      throw Error("对局中请保留座位；临时断开请使用 stop()，稍后可恢复。");
    if (this.isHost) {
      await Promise.all(
        this.saved.peers
          .filter((p) => p.id !== this.identity.id)
          .map((p) =>
            this.sendTo(p.id, p.publicKey, {
              kind: "closed",
              message: "房主已经收桌。",
            }),
          ),
      );
    } else {
      if (this.pending && this.pending.command.type !== "leave")
        throw Error("上一操作正在确认，请稍候。");
      const request = this.pending ?? this.makeRequest({ type: "leave" });
      if (!this.pending) await this.request(request.command, request);
      await this.waitForLeave(request.id);
    }
    this.stop();
    this.emit("closed");
    try {
      if (this.store.getItem(SAVE) === this.lastWritten)
        this.store.removeItem(SAVE);
    } catch {
      this.warning = "本机座位信息暂时无法清除。";
    }
  }
}

export async function createRoom(
  name: string,
  options: RoomOptions = {},
): Promise<ScoutRoom> {
  const requested = options.code?.trim();
  if (requested && !validCode(requested))
    throw Error("创建房间号必须是6位数字。");
  const identity = await createIdentity();
  const saved: SavedRoom = {
    version: 1,
    code: requested || codeOf(),
    claimed: false,
    name: nameOf(name),
    identity: identity.saved,
    hostId: identity.id,
    pin: identity.id,
    peers: [
      {
        id: identity.id,
        name: nameOf(name),
        ready: true,
        publicKey: identity.publicKey,
      },
    ],
    game: null,
    playing: false,
    revision: 0,
    blocked: [],
    receipts: {},
  };
  return new ScoutRoom(saved, identity, options);
}
export async function joinRoom(
  name: string,
  input: string,
  pin = "",
  options: RoomOptions = {},
): Promise<ScoutRoom> {
  const code = input.replace(/[\s-]/g, "").toUpperCase();
  if (!validCode(code)) throw Error("请输入6位数字房间码。");
  if (pin && !/^[0-9a-f]{64}$/.test(pin))
    throw Error("邀请链接不完整，请重新复制。");
  const identity = await createIdentity();
  return new ScoutRoom(
    {
      version: 1,
      code,
      name: nameOf(name),
      identity: identity.saved,
      hostId: "",
      pin,
      peers: [],
      game: null,
      playing: false,
      revision: 0,
      blocked: [],
      receipts: {},
    },
    identity,
    options,
  );
}
export async function restoreRoom(
  options: RoomOptions = {},
): Promise<ScoutRoom | null> {
  const raw = (options.store ?? storage()).getItem(SAVE);
  if (!raw) return null;
  try {
    const saved = JSON.parse(raw) as SavedRoom;
    if (
      saved.version !== 1 ||
      !validCode(saved.code) ||
      !Array.isArray(saved.peers) ||
      !Number.isInteger(saved.revision) ||
      !saved.receipts ||
      !Array.isArray(saved.blocked) ||
      !validTurnLimit(saved.turnLimitSeconds ?? 0) ||
      (saved.clockSeq !== undefined &&
        (!Number.isInteger(saved.clockSeq) || saved.clockSeq < 0)) ||
      (saved.turnClock != null && !readTurnClock(saved.turnClock))
    )
      throw Error();
    return new ScoutRoom(
      saved,
      await restoreIdentity(saved.identity),
      options,
      raw,
    );
  } catch {
    throw Error("这桌的本机记录无法恢复，请重新创建或加入房间。");
  }
}
export function clearSavedRoom(options: Pick<RoomOptions, "store"> = {}) {
  (options.store ?? storage()).removeItem(SAVE);
}

export function hasSavedRoom(
  options: Pick<RoomOptions, "store"> = {},
): boolean {
  try {
    return !!(options.store ?? storage()).getItem(SAVE);
  } catch {
    return false;
  }
}

export function roomJoinGuard(
  snapshot: RoomSnapshot | null,
  hasController: boolean,
): string {
  if (hasController || (snapshot && snapshot.status !== "closed"))
    return "你已在房间中，请先离开当前房间。";
  return "";
}

export function roomLink(code: string, pin: string): string {
  const url = new URL(
    typeof location === "undefined"
      ? "https://example.invalid/scout/"
      : location.href,
  );
  url.search = "";
  url.hash = "";
  url.searchParams.set("room", code);
  url.searchParams.set("pin", pin);
  return typeof location === "undefined"
    ? `${url.pathname}${url.search}`
    : url.href;
}
