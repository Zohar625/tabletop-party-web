import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { ScoutView } from "./types.ts";
import { unreadEvents } from "./ui-model.ts";
import type { EventCursor } from "./ui-model.ts";
type Position = { rect: DOMRect; clone: HTMLElement };
export function useCardMotion(
  root: RefObject<HTMLElement | null>,
  game: ScoutView,
  fresh: boolean,
  previewFlip: boolean,
) {
  const before = useRef(new Map<string, Position>()),
    cursor = useRef<EventCursor | null>(null),
    previousFlip = useRef(previewFlip),
    previousFaces = useRef(new Map<string, number>());
  const running = useRef<Animation[]>([]),
    ghosts = useRef<HTMLElement[]>([]);
  useLayoutEffect(() => {
    const stage = root.current;
    if (!stage) return;
    const next = new Map<string, Position>(),
      nodes = new Map<string, HTMLElement>();
    stage.querySelectorAll<HTMLElement>("[data-motion]").forEach((el) => {
      const key = el.dataset.motion!;
      nodes.set(key, el);
      next.set(key, {
        rect: el.getBoundingClientRect(),
        clone: el.cloneNode(true) as HTMLElement,
      });
    });
    const update = unreadEvents(
      cursor.current,
      game.matchId,
      game.eventSeq,
      game.events,
    );
    const deal =
      (!cursor.current && fresh) ||
      update.events.some((e) => e.kind === "deal");
    const rotate = previousFlip.current !== previewFlip;
    const ownScout = update.events.find(e=>e.kind==='scout'&&e.actorId===game.me.id);
    const flippedCardId = ownScout?.flipped ? ownScout.cards?.[0]?.id : undefined;
    const faceChanges = new Set(game.me.hand.filter(c=>previousFaces.current.has(c.id)&&previousFaces.current.get(c.id)!==c.top).map(c=>`card:${c.id}`));
    previousFaces.current = new Map(game.me.hand.map(c=>[c.id,c.top]));
    cursor.current = update.cursor;
    previousFlip.current = previewFlip;
    const old = before.current;
    before.current = next;
    if (!deal && !rotate && !update.events.length) return;
    running.current.forEach((a) => a.finish());
    running.current = [];
    ghosts.current.forEach((n) => n.remove());
    ghosts.current = [];
    if (
      document.hidden ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      typeof Element.prototype.animate !== "function"
    )
      return;
    const play = (
      el: HTMLElement,
      from: DOMRect,
      to: DOMRect,
      delay = 0,
      turn = false,
    ) => {
      const animation = el.animate(
        [
          {
            transform: `translate(${from.left - to.left}px,${from.top - to.top}px) rotate(${turn ? 180 : deal ? -12 : 0}deg) scale(${deal ? 0.6 : 1})`,
            opacity: deal ? 0 : 1,
          },
          { transform: "translate(0,0) rotate(0deg) scale(1)", opacity: 1 },
        ],
        {
          duration: turn ? 620 : 520,
          delay,
          easing: "cubic-bezier(.19,1,.22,1)",
          fill: "backwards",
        },
      );
      running.current.push(animation);
    };
    const fly = (
      source: Position,
      target: DOMRect,
      back = false,
      chip = false,
    ) => {
      const ghost = document.createElement("div");
      ghost.className = `sc-flying${chip ? " sc-flying-chip" : ""}`;
      ghost.setAttribute("aria-hidden", "true");
      if (chip) ghost.textContent = "+1";
      else if (back) {
        const backNode = document.createElement("span");
        backNode.className = "sc-card sc-card-back";
        backNode.textContent = "◆";
        ghost.append(backNode);
      } else ghost.append(source.clone);
      Object.assign(ghost.style, {
        left: `${source.rect.left}px`,
        top: `${source.rect.top}px`,
        width: `${source.rect.width}px`,
        height: `${source.rect.height}px`,
      });
      document.body.append(ghost);
      ghosts.current.push(ghost);
      const a = ghost.animate(
        [
          { transform: "translate(0,0) scale(1)", opacity: 1 },
          {
            transform: `translate(${target.left - source.rect.left}px,${target.top - source.rect.top}px) scale(.35) rotate(12deg)`,
            opacity: 0.15,
          },
        ],
        { duration: 620, easing: "cubic-bezier(.22,.7,.24,1)" },
      );
      running.current.push(a);
      a.onfinish = () => ghost.remove();
    };
    let stagger = 0;
    for (const [key, node] of nodes) {
      if (!key.startsWith("card:")) continue;
      const dest = next.get(key)!.rect;
      const inHand = game.me.hand.some(c=>key===`card:${c.id}`);
      const turn = (rotate && inHand) || faceChanges.has(key) || key===`card:${flippedCardId}`;
      let source = old.get(key)?.rect;
      const show = update.events.find(
        (e) =>
          e.kind === "show" && e.cards?.some((c) => key === `card:${c.id}`),
      );
      if (!source && show)
        source =
          old.get(`seat:${show.actorId}`)?.rect ??
          next.get(`seat:${show.actorId}`)?.rect;
      if (deal) source = next.get("deck")?.rect;
      if (
        source &&
        (deal ||
          turn ||
          Math.abs(source.left - dest.left) > 1 ||
          Math.abs(source.top - dest.top) > 1)
      )
        play(node, source, dest, deal ? stagger++ * 35 : 0, turn);
    }
    for (const event of update.events) {
      if (event.kind === "show")
        for (const card of event.captured ?? []) {
          const source = old.get(`card:${card.id}`),
            dest = next.get(`score:${event.actorId}`);
          if (source && dest) fly(source, dest.rect);
        }
      if (event.kind === "scout") {
        if (event.actorId !== game.me.id)
          for (const card of event.cards ?? []) {
            const source = old.get(`card:${card.id}`),
              dest = next.get(`seat:${event.actorId}`);
            if (source && dest) fly(source, dest.rect, true);
          }
        if (game.players.length > 2 && event.sourceOwnerId) {
          const source = old.get("deck"),
            dest = next.get(`score:${event.sourceOwnerId}`);
          if (source && dest) fly(source, dest.rect, false, true);
        }
      }
      if (event.kind === "roundEnd") {
        const receipt = stage.querySelector<HTMLElement>(".sc-receipt");
        if (receipt)
          running.current.push(
            receipt.animate(
              [
                { transform: "translateY(32px)", opacity: 0 },
                { transform: "translateY(0)", opacity: 1 },
              ],
              { duration: 450, easing: "ease-out" },
            ),
          );
      }
    }
  });
  useLayoutEffect(() => {
    const finish = () => {
      if (document.hidden) {
        running.current.forEach((a) => a.finish());
        ghosts.current.forEach((n) => n.remove());
      }
    };
    document.addEventListener("visibilitychange", finish);
    return () => {
      document.removeEventListener("visibilitychange", finish);
      running.current.forEach((a) => a.cancel());
      ghosts.current.forEach((n) => n.remove());
    };
  }, []);
}
