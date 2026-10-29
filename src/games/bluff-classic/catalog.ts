import catalog from "../../../data/playtest-registry.json" with { type: "json" };
/** Lobby metadata only: importing this module never loads card explanations. */
export const classicPacks: { id: string; title: string; count: number }[] =
  catalog.packs.map((pack) => ({
    id: pack.id,
    title: pack.title,
    count: pack.verifiedCount,
  }));
