import { pick, randomInt } from '../sim/rng';
import type { PlaceholderRole, RosterTeaserSlot } from '../domain/types';

// Wholly invented naming pools — no real orgs, players, or teams.
const ORG_NAME_SEEDS = [
  'نيكسس', 'أوبليفن', 'كاتاليست', 'فورتيرا', 'إيكليبس', 'زينيث',
  'روننغيد', 'سولستيس', 'فانغارد', 'أوريون', 'دريفت', 'مونارك',
];

const PLAYER_FIRST_NAMES = [
  'كايرو', 'سكراي', 'ميد', 'هنتر', 'فيلن', 'زيرو', 'لينكس', 'بليد',
  'نوفا', 'إيكو', 'ريفت', 'دوسك', 'إمبر', 'وريث', 'أورس', 'شيد',
];

const ROLES: PlaceholderRole[] = ['front', 'flex', 'control', 'damage', 'support'];

export function suggestOrgName(rng: () => number): string {
  return pick(rng, ORG_NAME_SEEDS);
}

export function deriveTag(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  if (!cleaned) return 'ORG';
  const words = cleaned.split(' ');
  if (words.length === 1) return cleaned.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export function generateRosterTeaser(rng: () => number, count = 5): RosterTeaserSlot[] {
  const pool = [...PLAYER_FIRST_NAMES];
  const roles = [...ROLES];
  const slots: RosterTeaserSlot[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = randomInt(rng, 0, pool.length - 1);
    const [name] = pool.splice(idx, 1);
    const role = roles[i % roles.length];
    slots.push({ id: `roster-${i}`, displayName: name, role });
  }
  return slots;
}

export const ROLE_LABELS_AR: Record<PlaceholderRole, string> = {
  front: 'مقدمة',
  flex: 'مرن',
  control: 'تحكم',
  damage: 'ضرر',
  support: 'دعم',
};
