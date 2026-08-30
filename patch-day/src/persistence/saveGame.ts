import type { GameWorld, SaveGame } from '../domain/types';
import { SAVE_SCHEMA_VERSION } from '../domain/types';

const STORAGE_KEY = 'patch-day:save:v1';

export function loadSaveGame(): SaveGame | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveGame;
    if (parsed.schemaVersion !== SAVE_SCHEMA_VERSION) {
      // Future schema migrations slot in here. For now an unknown/older
      // version is treated as unreadable rather than silently corrupted.
      console.warn('PATCH DAY: save schema mismatch, ignoring old save.');
      return null;
    }
    return parsed;
  } catch (err) {
    console.warn('PATCH DAY: failed to read save.', err);
    return null;
  }
}

export function writeSaveGame(world: GameWorld): SaveGame {
  const save: SaveGame = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    world,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch (err) {
    console.warn('PATCH DAY: failed to write save.', err);
  }
  return save;
}

export function clearSaveGame(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// Autosave trigger points named by the master prompt (§33, Part 3): Advance
// Week, contract signing, tournament conclusion, Major Patch. Most of those
// events don't exist yet in Part 1 — this is the single call Part 2/3 code
// will invoke when they land, so no rewrite is needed later.
export type AutosaveTrigger =
  | 'manual'
  | 'advance-week'
  | 'contract-signed'
  | 'tournament-concluded'
  | 'major-patch';

export function autosave(world: GameWorld, _trigger: AutosaveTrigger): SaveGame {
  return writeSaveGame(world);
}
