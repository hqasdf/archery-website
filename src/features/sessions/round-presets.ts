// Display definitions only. Scoring validation and persistence come in a later step.
export type RoundPreset = {
  id: string;
  distanceMetres: number;
  requiredArrows: number;
  defaultEnds: number;
  defaultArrowsPerEnd: number;
};

export const MAX_ARROW_SCORE = 10;
export const BOW_STYLES = ["recurve", "compound"] as const;
export type BowStyle = (typeof BOW_STYLES)[number];

export const ROUND_PRESETS = [
  {
    id: "18m-30",
    distanceMetres: 18,
    requiredArrows: 30,
    defaultEnds: 10,
    defaultArrowsPerEnd: 3,
  },
  {
    id: "30m-36",
    distanceMetres: 30,
    requiredArrows: 36,
    defaultEnds: 6,
    defaultArrowsPerEnd: 6,
  },
  {
    id: "50m-36",
    distanceMetres: 50,
    requiredArrows: 36,
    defaultEnds: 6,
    defaultArrowsPerEnd: 6,
  },
  {
    id: "70m-36",
    distanceMetres: 70,
    requiredArrows: 36,
    defaultEnds: 6,
    defaultArrowsPerEnd: 6,
  },
] as const satisfies readonly RoundPreset[];
