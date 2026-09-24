export type ArrowCounterState = {
  version: 2;
  totalArrows: number;
  increment: number;
  history: number[];
};

export const DEFAULT_COUNTER: ArrowCounterState = {
  version: 2,
  totalArrows: 0,
  increment: 6,
  history: [],
};

export const COUNTER_STORAGE_KEY = "arc-track-arrow-counter";

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

export function readCounter(value: unknown): ArrowCounterState {
  if (!value || typeof value !== "object") return DEFAULT_COUNTER;
  const candidate = value as Record<string, unknown>;
  if (candidate.version === 1 && Number.isSafeInteger(candidate.totalArrows) && Number(candidate.totalArrows) >= 0) {
    return { ...DEFAULT_COUNTER, totalArrows: Number(candidate.totalArrows) };
  }
  if (candidate.version !== 2 || !Number.isSafeInteger(candidate.totalArrows) || Number(candidate.totalArrows) < 0 || !isPositiveSafeInteger(candidate.increment) || !Array.isArray(candidate.history)) return DEFAULT_COUNTER;
  const totalArrows = Number(candidate.totalArrows);
  const history = candidate.history.every(isPositiveSafeInteger) ? candidate.history as number[] : [];
  const safeHistory = history.reduce((sum, addition) => sum + addition, 0) <= totalArrows ? history : [];
  return { version: 2, totalArrows, increment: candidate.increment, history: safeHistory };
}

export function addArrows(state: ArrowCounterState): ArrowCounterState {
  if (state.totalArrows > Number.MAX_SAFE_INTEGER - state.increment) return state;
  return { ...state, totalArrows: state.totalArrows + state.increment, history: [...state.history, state.increment] };
}

export function undoLastAddition(state: ArrowCounterState): ArrowCounterState {
  const lastAddition = state.history.at(-1);
  if (!lastAddition) return state;
  return { ...state, totalArrows: Math.max(0, state.totalArrows - lastAddition), history: state.history.slice(0, -1) };
}

export function setIncrement(state: ArrowCounterState, increment: number): ArrowCounterState {
  if (!isPositiveSafeInteger(increment)) return state;
  return { ...state, increment };
}

export function resetCounter(state: ArrowCounterState): ArrowCounterState {
  return { ...state, totalArrows: 0, history: [] };
}
