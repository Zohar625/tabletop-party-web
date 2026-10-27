import type { ScoutView } from "./types.ts";
export function newMatchReady(peers: { ready: boolean; online: boolean }[]) {
  return (
    peers.length >= 2 &&
    peers.length <= 5 &&
    peers.every((p) => p.ready && p.online)
  );
}
export function seatAttention(game: ScoutView, id: string) {
  const p = game.players.find((p) => p.id === id);
  if (game.phase === "orienting")
    return p?.orientationConfirmed
      ? { kind: "ready", text: "方向已确认" }
      : { kind: "waiting", text: "待确认方向" };
  if (game.phase === "playing" && game.turnId === id)
    return {
      kind: "turn",
      text:
        (game.comboActorId === id ? "继续演出" : "正在行动") +
        ` · ${p?.handCount ?? 0} 张手牌`,
    };
  return { kind: "idle", text: p ? `${p.handCount} 张手牌` : "" };
}
export function gameAttention(game: ScoutView) {
  if (game.phase === "orienting")
    return {
      title: "开场前 · 确认手牌方向",
      detail:
        "等待确认：" +
        game.players
          .filter((p) => !p.orientationConfirmed)
          .map((p) => p.name)
          .join("、"),
    };
  if (game.phase === "roundEnd")
    return {
      title: "等待房主开启下一轮",
      detail: "本轮已结算，房主点击「开启下一轮」继续。",
    };
  if (game.phase === "finished")
    return { title: "本场巡演结束", detail: "查看总分，或等房主再开一局。" };
  const current = game.players.find((p) => p.id === game.turnId);
  return {
    title:
      game.turnId === game.me.id
        ? "轮到你了"
        : `轮到 ${current?.name ?? "团员"} 行动`,
    detail: game.comboActorId
      ? "挖角完成，现在由同一位玩家继续演出。"
      : "演出，或从舞台两端挖角。其余玩家可以观察和聊天。",
  };
}
export function lobbyAttention(
  peers: { id: string; name: string; ready: boolean; online: boolean }[],
) {
  const offline = peers.filter((p) => !p.online).map((p) => p.name),
    unready = peers.filter((p) => p.online && !p.ready).map((p) => p.name);
  return {
    title:
      peers.length < 2
        ? "等待同伴入桌"
        : offline.length || unready.length
          ? "还差一点，马上开场"
          : "全员就位，等房主开场",
    detail:
      [
        offline.length ? "等待连接：" + offline.join("、") : "",
        unready.length ? "尚未准备：" + unready.join("、") : "",
      ]
        .filter(Boolean)
        .join(" · ") ||
      (peers.length < 2
        ? "至少需要2位团员入桌，准备后再开场。"
        : "房主点击开始，就能发牌。"),
  };
}
