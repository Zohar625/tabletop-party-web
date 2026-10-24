const encoder = new TextEncoder();
const decoder = new TextDecoder();
const stringBytes = (value: string) => {
  const bytes = encoder.encode(value);
  return new Uint8Array([bytes.length >> 8, bytes.length & 255, ...bytes]);
};
export function encodePacket(type: number, body: Uint8Array): Uint8Array {
  const length: number[] = [];
  let remaining = body.length;
  do {
    let digit = remaining % 128;
    remaining = Math.floor(remaining / 128);
    if (remaining) digit |= 128;
    length.push(digit);
  } while (remaining);
  return new Uint8Array([type, ...length, ...body]);
}
function headerSize(packet: Uint8Array) {
  let cursor = 1;
  while (packet[cursor++] & 128) {
    if (cursor > 5) throw new Error("消息格式错误");
  }
  return cursor;
}
export function decodePublish(packet: Uint8Array): {
  topic: string;
  payload: string;
} {
  const start = headerSize(packet);
  const size = packet[start] * 256 + packet[start + 1];
  const topic = decoder.decode(packet.slice(start + 2, start + 2 + size));
  const qos = (packet[0] >> 1) & 3;
  return {
    topic,
    payload: decoder.decode(packet.slice(start + 2 + size + (qos ? 2 : 0))),
  };
}

export interface RoomTransport {
  connect(): Promise<void>;
  send(message: unknown): void;
  close(): void;
  onMessage: (message: unknown) => void;
  onOffline: () => void;
}

// MQTT 3.1.1, QoS 0. Periodic snapshots recover a missed game update.
export class MqttTransport implements RoomTransport {
  onMessage: (message: unknown) => void = () => {};
  onOffline: () => void = () => {};
  private socket: WebSocket | null = null;
  private ping: ReturnType<typeof setInterval> | undefined;
  private closed = false;
  private buffer = new Uint8Array(0);
  private topic: string;
  constructor(code: string) {
    this.topic = `tabletop-dinner/v1/${code}`;
  }

  connect(): Promise<void> {
    this.closed = false;
    this.buffer = new Uint8Array(0);
    return new Promise((resolve, reject) => {
      let ready = false;
      let settled = false;
      const socket = new WebSocket("wss://broker.emqx.io:8084/mqtt", ["mqtt"]);
      this.socket = socket;
      socket.binaryType = "arraybuffer";
      const fail = () => {
        if (!settled) {
          settled = true;
          reject(new Error("联机中转暂时无法连接，请稍后重试或切换网络。"));
        }
        socket.close();
      };
      const timeout = setTimeout(fail, 12000);
      socket.onopen = () => {
        const clientId = `ttt-${crypto.randomUUID().slice(0, 18)}`;
        this.write(
          encodePacket(
            0x10,
            new Uint8Array([
              ...stringBytes("MQTT"),
              4,
              2,
              0,
              30,
              ...stringBytes(clientId),
            ]),
          ),
        );
      };
      socket.onmessage = (event) => {
        const data = new Uint8Array(event.data as ArrayBuffer);
        if (this.buffer.length + data.length > 131072) {
          fail();
          return;
        }
        this.buffer = new Uint8Array([...this.buffer, ...data]);
        while (this.buffer.length >= 2) {
          let length = 0,
            multiplier = 1,
            cursor = 1,
            digit: number;
          do {
            if (cursor >= this.buffer.length) return;
            digit = this.buffer[cursor++];
            length += (digit & 127) * multiplier;
            multiplier *= 128;
            if (cursor > 5) {
              fail();
              return;
            }
          } while (digit & 128);
          if (this.buffer.length < cursor + length) return;
          const packet = this.buffer.slice(0, cursor + length);
          this.buffer = this.buffer.slice(cursor + length);
          const type = packet[0] >> 4;
          if (type === 2) {
            if (packet[cursor + 1] !== 0) {
              fail();
              return;
            }
            this.write(
              encodePacket(
                0x82,
                new Uint8Array([0, 1, ...stringBytes(this.topic), 0]),
              ),
            );
          } else if (type === 9) {
            if (packet[cursor + 2] === 128) {
              fail();
              return;
            }
            ready = true;
            settled = true;
            clearTimeout(timeout);
            this.ping = setInterval(
              () => this.write(new Uint8Array([0xc0, 0])),
              10000,
            );
            resolve();
          } else if (type === 3) {
            try {
              const { topic, payload } = decodePublish(packet);
              if (topic === this.topic && payload.length <= 30000)
                this.onMessage(JSON.parse(payload));
            } catch {
              /* Ignore malformed public-topic messages. */
            }
          }
        }
      };
      socket.onerror = fail;
      socket.onclose = () => {
        clearTimeout(timeout);
        clearInterval(this.ping);
        if (!settled) {
          settled = true;
          reject(new Error("联机连接中断，请重试。"));
        }
        if (ready && !this.closed) this.onOffline();
      };
    });
  }
  private write(packet: Uint8Array) {
    if (this.socket?.readyState === WebSocket.OPEN)
      this.socket.send(packet.buffer as ArrayBuffer);
  }
  send(message: unknown) {
    if (this.socket?.readyState !== WebSocket.OPEN)
      throw new Error("网络已断开，正在重新连接。");
    this.write(
      encodePacket(
        0x30,
        new Uint8Array([
          ...stringBytes(this.topic),
          ...encoder.encode(JSON.stringify(message)),
        ]),
      ),
    );
  }
  close() {
    this.closed = true;
    clearInterval(this.ping);
    this.socket?.close();
  }
}
