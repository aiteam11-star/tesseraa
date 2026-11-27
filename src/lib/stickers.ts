export const STICKERS = [
  { id: "clear-brief", label: "Clear brief", hue: 172 },
  { id: "sharp-eye", label: "Sharp eye", hue: 205 },
  { id: "steady-hands", label: "Steady hands", hue: 40 },
  { id: "fast-turn", label: "Fast turnaround", hue: 12 },
  { id: "generous", label: "Generous feedback", hue: 330 },
  { id: "thoughtful", label: "Thoughtful", hue: 250 },
] as const;
export const STICKER_IDS = STICKERS.map((s) => s.id) as [string, ...string[]];
