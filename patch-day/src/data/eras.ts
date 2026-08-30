import type { Era } from '../domain/types';

// Eras are not skins — later phases will hang real UI/economy/tooling
// changes off these, per master prompt §17-22. Part 1 only fully implements
// the Underground look; the rest are data placeholders for now.
export const ERAS: Era[] = [
  {
    id: 'underground',
    order: 1,
    nameAr: 'العصر السري',
    taglineAr: 'خشب، أوراق، وأختام على طاولة مكتب صغيرة.',
    descriptionAr:
      'اكتشاف المواهب يمر عبر بطولات LAN ومقاهي الإنترنت والمنتديات والتوصيات الشخصية. لا مواقع، لا قواعد بيانات — فقط دفاتر حسابات وPolaroids وخرائط مثبّتة بالدبابيس.',
    startYear: 2003,
  },
  {
    id: 'professionalization',
    order: 2,
    nameAr: 'عصر الاحتراف',
    taglineAr: 'المكتب يتحسن، لكنه لا ينسى بداياته.',
    descriptionAr:
      'تظهر المواقع والبريد الإلكتروني وقواعد بيانات أولية، وتكبر البطولات، وتصبح عقود الرعاية جادة.',
    startYear: 2008,
  },
  {
    id: 'streaming-boom',
    order: 3,
    nameAr: 'طفرة البث',
    taglineAr: 'كل انتصار الآن له جمهور يشاهده مباشرة.',
    descriptionAr:
      'منصات البث والسوشال ميديا وصنّاع المحتوى وتحليلات الجمهور تدخل المعادلة، ويبدأ صراع النجاح التنافسي مقابل النجاح الإعلامي.',
    startYear: 2013,
  },
  {
    id: 'data-era',
    order: 4,
    nameAr: 'عصر البيانات',
    taglineAr: 'أرقام أكثر، يقين أقل مما تظن.',
    descriptionAr:
      'تحليلات متقدمة وخرائط حرارية ونمذجة ميتا ومساعدة ذكاء اصطناعي في التحليل — لكن التحيز والعينات الناقصة ما زالا موجودين.',
    startYear: 2018,
  },
  {
    id: 'future-esports',
    order: 5,
    nameAr: 'مستقبل الإسبورتس',
    taglineAr: 'من مكتب صغير إلى غرفة عمليات عالمية.',
    descriptionAr:
      'غرفة حرب متقدمة، نماذج تنبؤية، إدارة منظمات عالمية، ومحفظة ألعاب متعددة، وتأثير مباشر على قرارات الناشر.',
    startYear: 2024,
  },
];

export const DEFAULT_ERA_ID = ERAS[0].id;
