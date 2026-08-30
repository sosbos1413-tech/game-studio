import type { NavSection } from '../domain/types';

// Prompt §25: don't show every section from day one — open sections as the
// player needs them. Part 1 implements Manager Desk only; everything else
// exists as a locked placeholder so the nav reads as a real, growing org
// rather than dead UI (prompt §42 forbids fake-clickable buttons — locked
// items are visibly disabled, not silently non-functional).
export const NAV_SECTIONS: NavSection[] = [
  { id: 'desk', labelAr: 'المكتب', unlocksAtEra: 'underground', implemented: true },
  { id: 'roster', labelAr: 'التشكيلة', unlocksAtEra: 'underground', implemented: false },
  { id: 'staff', labelAr: 'الطاقم', unlocksAtEra: 'underground', implemented: false },
  { id: 'training', labelAr: 'التدريب', unlocksAtEra: 'underground', implemented: false },
  { id: 'war-room', labelAr: 'War Room', unlocksAtEra: 'underground', implemented: false },
  { id: 'patch-lab', labelAr: 'Patch Lab', unlocksAtEra: 'underground', implemented: false },
  { id: 'meta', labelAr: 'الميتا', unlocksAtEra: 'underground', implemented: false },
  { id: 'scrims', labelAr: 'Scrims', unlocksAtEra: 'underground', implemented: false },
  { id: 'rivals', labelAr: 'المنافسون', unlocksAtEra: 'underground', implemented: false },
  { id: 'matches', labelAr: 'المباريات', unlocksAtEra: 'underground', implemented: false },
  { id: 'tournaments', labelAr: 'البطولات', unlocksAtEra: 'underground', implemented: false },
  { id: 'scouting', labelAr: 'الاستكشاف', unlocksAtEra: 'underground', implemented: false },
  { id: 'market', labelAr: 'السوق', unlocksAtEra: 'professionalization', implemented: false },
  { id: 'contracts', labelAr: 'العقود', unlocksAtEra: 'professionalization', implemented: false },
  { id: 'finance', labelAr: 'المالية', unlocksAtEra: 'underground', implemented: false },
  { id: 'audience', labelAr: 'الجمهور', unlocksAtEra: 'streaming-boom', implemented: false },
  { id: 'content', labelAr: 'المحتوى', unlocksAtEra: 'streaming-boom', implemented: false },
  { id: 'sponsors', labelAr: 'الرعاة', unlocksAtEra: 'professionalization', implemented: false },
  { id: 'news', labelAr: 'الأخبار', unlocksAtEra: 'underground', implemented: false },
  { id: 'org', labelAr: 'المؤسسة', unlocksAtEra: 'underground', implemented: false },
  { id: 'history', labelAr: 'التاريخ', unlocksAtEra: 'underground', implemented: false },
  { id: 'settings', labelAr: 'الإعدادات', unlocksAtEra: 'underground', implemented: true },
];
