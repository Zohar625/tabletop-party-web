export interface ChatMessage {
  id: string;
  seq: number;
  authorId: string;
  name: string;
  text: string;
  sentAt: number;
}
export const quickPhrases = [
  {
    name: "自信",
    phrases: [
      "我这牌无敌了",
      "正反面都是好牌呀",
      "这把有说法",
      "好戏才刚开始",
      "我宣布，这轮我要起飞了",
    ],
  },
  {
    name: "哀嚎",
    phrases: [
      "我这牌烂完了呀",
      "废了吗这不",
      "这怎么正反面都没用",
      "翻过来也救不了我",
      "我跟这手牌不熟",
      "求求你放过我吧",
      "别搞",
    ],
  },
  {
    name: "接招",
    phrases: [
      "就等你这么打呢",
      "谢谢老板送的好牌",
      "好活儿！",
      "这张牌我就收下了",
      "你这一下有点东西",
      "这么快就出对了",
      "出这么大吗？",
    ],
  },
  {
    name: "催促",
    phrases: [
      "快点呀我急急急",
      "轮到你啦",
      "容我想想",
      "别急，正在组织演出",
      "人齐了就开吧",
      "他要跑了，快出大牌",
      "要逃了他",
    ],
  },
];
export function barrageUpdate(
  messages: ChatMessage[],
  after: number,
  now: number,
  baseline = false,
) {
  return {
    after: Math.max(after, ...messages.map((m) => m.seq)),
    messages: (baseline ? [] : messages)
      .filter(
        (m) =>
          m.seq > after && now - m.sentAt < 15000 && m.sentAt <= now + 5000,
      )
      .sort((a, b) => a.seq - b.seq)
      .filter((m, i, list) => i === 0 || list[i - 1].seq !== m.seq),
  };
}
export function cleanChatText(value: unknown): string {
  if (typeof value !== "string") throw Error("请输入聊天内容。");
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!text) throw Error("聊天内容不能为空。");
  if (Array.from(text).length > 120) throw Error("聊天最多120字。");
  return text;
}
