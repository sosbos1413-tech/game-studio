import type { CrestBaseShape, CrestStylePreset, CrestSymbol } from '../domain/types';

export const BASE_SHAPES: { id: CrestBaseShape; labelAr: string }[] = [
  { id: 'shield', labelAr: 'درع' },
  { id: 'circle', labelAr: 'دائرة' },
  { id: 'diamond', labelAr: 'ماسة' },
  { id: 'hexagon', labelAr: 'سداسي' },
  { id: 'crest', labelAr: 'شعار نبالة' },
  { id: 'minimal-badge', labelAr: 'شارة بسيطة' },
  { id: 'wings-frame', labelAr: 'إطار أجنحة' },
  { id: 'laurel-frame', labelAr: 'إطار غار' },
  { id: 'no-frame', labelAr: 'بدون إطار' },
];

export const SYMBOLS: { id: CrestSymbol; labelAr: string }[] = [
  { id: 'wolf', labelAr: 'ذئب' },
  { id: 'falcon', labelAr: 'صقر' },
  { id: 'raven', labelAr: 'غراب' },
  { id: 'lion', labelAr: 'أسد' },
  { id: 'dragon', labelAr: 'تنين' },
  { id: 'cobra', labelAr: 'كوبرا' },
  { id: 'phoenix', labelAr: 'عنقاء' },
  { id: 'crown', labelAr: 'تاج' },
  { id: 'flame', labelAr: 'لهب' },
  { id: 'lightning', labelAr: 'صاعقة' },
  { id: 'star', labelAr: 'نجمة' },
  { id: 'sword', labelAr: 'سيف' },
  { id: 'helmet', labelAr: 'خوذة' },
  { id: 'eye', labelAr: 'عين' },
  { id: 'geometric', labelAr: 'هندسي' },
  { id: 'abstract', labelAr: 'تجريدي' },
  { id: 'none', labelAr: 'بدون رمز' },
];

export const STYLE_PRESETS: {
  id: CrestStylePreset;
  labelAr: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
}[] = [
  { id: 'classic', labelAr: 'كلاسيكي', primaryColor: '#1f2937', secondaryColor: '#d4af6a', accentColor: '#7c2d2d', backgroundColor: '#f3e9d2' },
  { id: 'vintage', labelAr: 'تراثي', primaryColor: '#4b3621', secondaryColor: '#c9a86a', accentColor: '#6b8f71', backgroundColor: '#ece0c4' },
  { id: 'military', labelAr: 'عسكري', primaryColor: '#3a4a34', secondaryColor: '#8a7748', accentColor: '#5c1f1f', backgroundColor: '#e5e0d0' },
  { id: 'minimal', labelAr: 'بسيط', primaryColor: '#111827', secondaryColor: '#6b7280', accentColor: '#111827', backgroundColor: '#f9fafb' },
  { id: 'cyber', labelAr: 'سايبر', primaryColor: '#0f172a', secondaryColor: '#22d3ee', accentColor: '#a855f7', backgroundColor: '#0b1020' },
  { id: 'royal', labelAr: 'ملكي', primaryColor: '#241a4a', secondaryColor: '#d4af37', accentColor: '#7c1d3f', backgroundColor: '#f1ecdd' },
  { id: 'aggressive', labelAr: 'عدواني', primaryColor: '#1a1a1a', secondaryColor: '#e11d2e', accentColor: '#e11d2e', backgroundColor: '#eaeaea' },
  { id: 'sport', labelAr: 'رياضي', primaryColor: '#0b3d91', secondaryColor: '#ffffff', accentColor: '#c8102e', backgroundColor: '#f4f6f8' },
  { id: 'street', labelAr: 'شارع', primaryColor: '#151515', secondaryColor: '#f2b705', accentColor: '#e63946', backgroundColor: '#dcdcdc' },
  { id: 'futuristic', labelAr: 'مستقبلي', primaryColor: '#050b18', secondaryColor: '#5ee7ff', accentColor: '#ff5ea8', backgroundColor: '#0a1226' },
];

export function stylePresetById(id: CrestStylePreset) {
  return STYLE_PRESETS.find((s) => s.id === id) ?? STYLE_PRESETS[0];
}
