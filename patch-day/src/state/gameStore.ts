import { create } from 'zustand';
import type { CrestSpec, GameWorld, Organization } from '../domain/types';
import { DEFAULT_ERA_ID } from '../data/eras';
import { generateRosterTeaser } from '../data/nameGenerator';
import { autosave, loadSaveGame, type AutosaveTrigger } from '../persistence/saveGame';
import { createSeededRng, generateWorldSeed } from '../sim/rng';

export type Screen = 'new-game' | 'crest-studio' | 'manager-desk';

interface GameState {
  screen: Screen;
  world: GameWorld | null;
  /** Org draft being built during the New Game → Crest Studio flow. */
  draftOrg: Organization | null;

  startNewGameFlow: () => void;
  setDraftOrg: (org: Organization) => void;
  updateDraftCrest: (crest: CrestSpec) => void;
  confirmCrestAndEnterDesk: () => void;
  loadFromStorage: () => boolean;
  triggerAutosave: (trigger: AutosaveTrigger) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  screen: 'new-game',
  world: null,
  draftOrg: null,

  startNewGameFlow: () => set({ screen: 'new-game', world: null, draftOrg: null }),

  setDraftOrg: (org) => set({ draftOrg: org, screen: 'crest-studio' }),

  updateDraftCrest: (crest) =>
    set((state) =>
      state.draftOrg ? { draftOrg: { ...state.draftOrg, crest } } : state,
    ),

  confirmCrestAndEnterDesk: () => {
    const { draftOrg } = get();
    if (!draftOrg) return;
    const seed = generateWorldSeed();
    const rng = createSeededRng(seed);
    const world: GameWorld = {
      seed,
      organization: draftOrg,
      currentEraId: DEFAULT_ERA_ID,
      clock: { day: 1 },
      rosterTeaser: generateRosterTeaser(rng),
    };
    set({ world, screen: 'manager-desk', draftOrg: null });
    autosave(world, 'manual');
  },

  loadFromStorage: () => {
    const save = loadSaveGame();
    if (!save) return false;
    set({ world: save.world, screen: 'manager-desk' });
    return true;
  },

  triggerAutosave: (trigger) => {
    const { world } = get();
    if (!world) return;
    autosave(world, trigger);
  },
}));
