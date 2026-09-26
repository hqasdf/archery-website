import { DIVISIONS, ROUND_PRESETS, type Division, type RoundPreset } from "@arc-track/core/presets";
import type { TargetFaceType } from "@arc-track/core/scoring";

export type RoundConfig = {
  name: string; division: Division; distanceMetres: number; faceDiameterCm: number;
  faceType: TargetFaceType; ends: number; arrowsPerEnd: number;
};

export function configFromPreset(preset: RoundPreset = ROUND_PRESETS[3]): RoundConfig {
  return {
    name: preset.name, division: "Recurve", distanceMetres: preset.distanceMetres,
    faceDiameterCm: preset.faceDiameterCm, faceType: preset.faceType,
    ends: preset.defaultEnds, arrowsPerEnd: preset.defaultArrowsPerEnd,
  };
}

export function buildRoundRpcArgs(sessionId: string, input: RoundConfig) {
  const name = input.name.trim();
  if (!sessionId) throw new Error("The Session could not be identified.");
  if (!name || Array.from(name).length > 80) throw new Error("Round name must contain 1 to 80 characters.");
  if (!(DIVISIONS as readonly string[]).includes(input.division)) throw new Error("Choose a valid division.");
  if (!["full_face", "six_ring", "triple_face"].includes(input.faceType)) throw new Error("Choose a valid target face.");
  if ([input.distanceMetres, input.faceDiameterCm, input.ends, input.arrowsPerEnd]
    .some((value) => !Number.isInteger(value) || value < 1 || value > 32767)) {
    throw new Error("Enter positive whole numbers up to 32767 for the Round measurements and counts.");
  }
  return {
    p_session_id: sessionId, p_name: name, p_division: input.division,
    p_distance_metres: input.distanceMetres, p_face_diameter_cm: input.faceDiameterCm,
    p_face_type: input.faceType, p_planned_ends: input.ends,
    p_arrows_per_end: input.arrowsPerEnd,
  };
}
