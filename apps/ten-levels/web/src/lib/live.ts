import { reactive } from "vue";

/**
 * Patch 0014: the nav bar drives the loaded Live Example. LiveExample registers its controls here while
 * it is mounted; NavBar shows Run, Reset and the set pills from it. Nothing is registered on the index.
 */
export interface LiveControls {
  key: string;
  sets: string[];
  setIndex: number;
  running: boolean;
  /** needs-your-data scenarios: Run disabled. */
  disabled: boolean;
  /** agent levels: no Run, the chat drives the session. */
  agent: boolean;
  runLabel: string;
  run: () => void;
  reset: () => void;
  selectSet: (i: number) => void;
  /** Patch 0015: the run produced something to show; the nav Results toggle opens the floating panel. */
  hasResults: boolean;
  resultsOpen: boolean;
  toggleResults: () => void;
}

export const live = reactive<{ controls: LiveControls | null; autorun: boolean }>({ controls: null, autorun: false });
