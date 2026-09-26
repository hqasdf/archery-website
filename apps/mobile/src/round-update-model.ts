import type { RoundDraft } from "@arc-track/core/scoring";
import type { Division } from "@arc-track/core/presets";

export type RoundSettingsInput = {
  name: string;
  division: Division;
  distanceMetres: number;
  faceDiameterCm: number;
  plannedEnds: number;
};

export function canConfigureRound(round: RoundDraft) {
  return round.arrows.length === 0;
}

export function buildRoundUpdateArgs(roundId: string, previousEnds: number, input: RoundSettingsInput) {
  const name = input.name.trim();
  if (!roundId) throw new Error("The Round could not be identified.");
  if (!name || Array.from(name).length > 80) throw new Error("Round name must contain 1 to 80 characters.");
  if (!["Recurve", "Compound", "Barebow", "Other"].includes(input.division)) throw new Error("Choose a valid division.");
  if ([input.distanceMetres, input.faceDiameterCm, input.plannedEnds]
    .some((value) => !Number.isInteger(value) || value < 1 || value > 32767)
    || input.plannedEnds < previousEnds) {
    throw new Error("Enter valid positive whole numbers. Planned Ends can only increase.");
  }
  return {
    p_round_id: roundId,
    p_name: name,
    p_division: input.division,
    p_distance_metres: input.distanceMetres,
    p_face_diameter_cm: input.faceDiameterCm,
    p_planned_ends: input.plannedEnds,
  };
}

export function sameRoundAfterUpdate(currentRoundId: string, returnedRoundId: string) {
  return currentRoundId === returnedRoundId;
}

export function mapRoundUpdateResult(
  expectedRoundId: string,
  expectedPlannedEnds: number,
  data: unknown,
  error: unknown,
) {
  const result = data as { round_id?: unknown; planned_ends?: unknown } | null;
  if (error || !result || !sameRoundAfterUpdate(expectedRoundId, String(result.round_id ?? ""))
    || result.planned_ends !== expectedPlannedEnds) {
    throw new Error("Round settings could not be saved. Your existing Round has not been replaced.");
  }
  return { roundId: expectedRoundId, plannedEnds: expectedPlannedEnds };
}
