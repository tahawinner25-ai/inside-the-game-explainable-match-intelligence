import { createInitialState } from "@/lib/simulation";
import type { MatchState } from "@/lib/schemas";

type Store = { state: MatchState };
const globalStore = globalThis as typeof globalThis & { insideGameStore?: Store };
const store = (globalStore.insideGameStore ??= { state: createInitialState() });

export function readState(): MatchState {
  return store.state;
}

export function writeState(state: MatchState): MatchState {
  store.state = state;
  return store.state;
}

export function resetState(): MatchState {
  store.state = createInitialState();
  return store.state;
}
