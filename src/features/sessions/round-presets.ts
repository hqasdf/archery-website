import type { TargetFaceType } from "./scoring-model";
export type RoundPreset = { id: string; name: string; distanceMetres: number; defaultEnds: number; defaultArrowsPerEnd: number; faceDiameterCm: number; faceType: TargetFaceType };
export type TargetFaceOption = { id: string; label: string; diameterCm: number; faceType: TargetFaceType };
export const DIVISIONS = ["Recurve", "Compound", "Barebow", "Other"] as const;
export type Division = (typeof DIVISIONS)[number];
export const TARGET_FACE_OPTIONS: readonly TargetFaceOption[] = [
  { id: "122-full", label: "122 cm full face", diameterCm: 122, faceType: "full_face" },
  { id: "80-full", label: "80 cm full face", diameterCm: 80, faceType: "full_face" },
  { id: "40-full", label: "40 cm full face", diameterCm: 40, faceType: "full_face" },
  { id: "40-triple", label: "Triple face", diameterCm: 40, faceType: "triple_face" },
  { id: "80-six", label: "80 cm 6-ring face", diameterCm: 80, faceType: "six_ring" },
] as const;
export const ROUND_PRESETS = [
  { id: "18m-30", name: "18 m indoor", distanceMetres: 18, defaultEnds: 10, defaultArrowsPerEnd: 3, faceDiameterCm: 40, faceType: "full_face" },
  { id: "30m-36", name: "30 m practice", distanceMetres: 30, defaultEnds: 6, defaultArrowsPerEnd: 6, faceDiameterCm: 80, faceType: "full_face" },
  { id: "50m-36", name: "50 m practice", distanceMetres: 50, defaultEnds: 6, defaultArrowsPerEnd: 6, faceDiameterCm: 80, faceType: "full_face" },
  { id: "70m-36", name: "70 m practice", distanceMetres: 70, defaultEnds: 6, defaultArrowsPerEnd: 6, faceDiameterCm: 122, faceType: "full_face" },
] as const satisfies readonly RoundPreset[];
