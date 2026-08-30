// Core domain types for PATCH DAY.
// Everything here describes a wholly fictional esports world — no real
// publishers, games, orgs, or players. See data/ for the fictional content
// that fills these shapes.

export type RegionId =
  | 'middle-east'
  | 'europe'
  | 'north-america'
  | 'east-asia'
  | 'southeast-asia'
  | 'south-america';

export interface Region {
  id: RegionId;
  nameAr: string;
  flavorAr: string;
}

export type EraId =
  | 'underground'
  | 'professionalization'
  | 'streaming-boom'
  | 'data-era'
  | 'future-esports';

export interface Era {
  id: EraId;
  order: number;
  nameAr: string;
  taglineAr: string;
  descriptionAr: string;
  /** Rough in-world year this era begins, for flavor text only. */
  startYear: number;
}

// ---- Crest & Brand Studio ----

export type CrestBaseShape =
  | 'shield'
  | 'circle'
  | 'diamond'
  | 'hexagon'
  | 'crest'
  | 'minimal-badge'
  | 'wings-frame'
  | 'laurel-frame'
  | 'no-frame';

export type CrestSymbol =
  | 'wolf'
  | 'falcon'
  | 'raven'
  | 'lion'
  | 'dragon'
  | 'cobra'
  | 'phoenix'
  | 'crown'
  | 'flame'
  | 'lightning'
  | 'star'
  | 'sword'
  | 'helmet'
  | 'eye'
  | 'geometric'
  | 'abstract'
  | 'none';

export type CrestStylePreset =
  | 'classic'
  | 'vintage'
  | 'military'
  | 'minimal'
  | 'cyber'
  | 'royal'
  | 'aggressive'
  | 'sport'
  | 'street'
  | 'futuristic';

export type CrestFinish = 'metallic' | 'flat';

export interface CrestSpec {
  baseShape: CrestBaseShape;
  symbol: CrestSymbol;
  /** Auto-derived from org name, but the player can override it. */
  letterMark: string;
  style: CrestStylePreset;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  finish: CrestFinish;
  outlineThickness: number; // 0-10
  symbolSize: number; // 0.5-1.5 scale
  symbolRotation: number; // degrees
}

// ---- Organization ----

export interface Organization {
  id: string;
  name: string;
  tag: string; // short abbreviation, e.g. "NXS"
  managerName?: string;
  regionId: RegionId;
  hqCity: string;
  foundingYear: number;
  primaryColor: string;
  secondaryColor: string;
  crest: CrestSpec;
  cash: number;
}

// ---- Placeholder roster (Part 1 only shows a teaser; real Player model is Part 2) ----

export type PlaceholderRole = 'front' | 'flex' | 'control' | 'damage' | 'support';

export interface RosterTeaserSlot {
  id: string;
  displayName: string;
  role: PlaceholderRole;
}

// ---- Time scale (stubbed for Part 1; real simulation lands in Part 2) ----

export type TimeScale = 'day' | 'week' | 'month' | 'season' | 'year';

export interface WorldClock {
  day: number; // absolute day counter since world creation
}

// ---- Navigation ----

export interface NavSection {
  id: string;
  labelAr: string;
  /** Which era first unlocks this section. */
  unlocksAtEra: EraId;
  /** Part-1 build only implements a subset; others render as locked. */
  implemented: boolean;
}

// ---- Save/Load ----

export const SAVE_SCHEMA_VERSION = 1;

export interface GameWorld {
  seed: string;
  organization: Organization;
  currentEraId: EraId;
  clock: WorldClock;
  rosterTeaser: RosterTeaserSlot[];
}

export interface SaveGame {
  schemaVersion: number;
  savedAt: string; // ISO timestamp
  world: GameWorld;
}
