/*
 * Game content: worlds, roles, units, heroes, equipment, spells, synergies.
 * Everything here is ORIGINAL placeholder content for the prototype and is
 * meant to be edited. Numbers are interpreted by core/combat.js.
 *
 * Effect objects (used by synergies, equipment, passives):
 *   { scope: 'members'|'all'|'front'|'back'|'self', stat, value }
 *   stats: atkPct hpPct asPct dr lifesteal crit critDmg skillPower
 *          startMana range startShieldPct regenPct
 */
(function () {
  const AMB = (globalThis.AMB = globalThis.AMB || {});

  const WORLDS = {
    ember: { id: 'ember', name: 'مملكة الجمر', en: 'Emberreach', color: '#ff7a45', glyph: '火',
      lore: 'إمبراطورية حدادين وساموراي تُشعل سيوفها من قلب بركان حيّ.' },
    tide: { id: 'tide', name: 'المدّ القمري', en: 'Moontide', color: '#3ec9ff', glyph: '水',
      lore: 'أرخبيل يحكمه القمر؛ أرواح الموج تحمي وتُشفي.' },
    neon: { id: 'neon', name: 'نيون-٩', en: 'Neon-9', color: '#c45cff', glyph: '電',
      lore: 'مدينة سيبرانية لا تنام؛ السرعة فيها عملة.' },
    sylvan: { id: 'sylvan', name: 'الغابة الأزلية', en: 'Elder Grove', color: '#52d67c', glyph: '森',
      lore: 'غابة أقدم من الزمن، جذورها جدران وأشجارها حرّاس.' },
  };

  const ROLES = {
    guardian: { side: 'front', kind: 'def', place: 'أمامي', id: 'guardian', name: 'حارس', en: 'Guardian', icon: 'shield', desc: 'وحدة دفاعية تحمي الخط الأمامي وتشتت العدو.' },
    fighter: { side: 'front', kind: 'off', place: 'أمامي', id: 'fighter', name: 'مقاتل', en: 'Fighter', icon: 'sword', desc: 'التحام متوازن بين التحمل والضرر.' },
    assassin: { side: 'any', kind: 'off', place: 'أمامي أو خلفي (يقفز للخلف)', id: 'assassin', name: 'قاتل', en: 'Assassin', icon: 'dagger', desc: 'يقفز فوق خط الدفاع إلى الصف الخلفي للخصم.' },
    mage: { side: 'back', kind: 'off', place: 'خلفي', id: 'mage', name: 'ساحر', en: 'Mage', icon: 'orb', desc: 'مهارات منطقة قوية، صحة منخفضة.' },
    marksman: { side: 'back', kind: 'off', place: 'خلفي', id: 'marksman', name: 'قناص', en: 'Marksman', icon: 'bow', desc: 'ضرر مستمر من مدى بعيد.' },
    support: { side: 'back', kind: 'def', place: 'خلفي', id: 'support', name: 'دعم', en: 'Support', icon: 'wings', desc: 'علاج ودروع وتعزيز للحلفاء.' },
  };

  // 1-star, tier-1 baseline per role. Tier multiplies hp & atk.
  const ROLE_BASE = {
    guardian: { hp: 620, atk: 44, as: 0.6, range: 1, def: 0.25, crit: 0.05 },
    fighter: { hp: 540, atk: 60, as: 0.75, range: 1, def: 0.12, crit: 0.05 },
    assassin: { hp: 420, atk: 68, as: 0.85, range: 1, def: 0.05, crit: 0.25 },
    mage: { hp: 420, atk: 38, as: 0.6, range: 3, def: 0, crit: 0.05 },
    marksman: { hp: 370, atk: 60, as: 0.75, range: 4, def: 0, crit: 0.1 },
    support: { hp: 450, atk: 32, as: 0.6, range: 3, def: 0.05, crit: 0.05 },
  };
  const TIER_MULT = { 1: 1, 2: 1.22, 3: 1.5 };

  /*
   * Skill types understood by the combat engine:
   *  nuke        dmg to current target
   *  cleave/aoe  dmg to target + enemies within radius
   *  stunAoe     aoe dmg + stun
   *  stunStrike  dmg + stun on target
   *  burn        damage over time on target (dps for dur)
   *  drain       dmg + heal self for the same amount
   *  execute     dmg, doubled vs targets under 40% hp
   *  snipe       dmg to the lowest-hp targetable enemy (ignores range)
   *  multishot   dmg to up to `count` nearest enemies
   *  taunt       nearby enemies must attack this unit for dur + shield self
   *  shieldSelf  shield self
   *  healSelf    heal self
   *  healLowest  heal the most wounded ally
   *  healAll     heal all allies
   *  hasteAllies all allies +attack speed for dur
   * Arrays are per star [1★, 2★, 3★].
   */
  const U = [];
  function unit(id, name, en, world, role, tier, mana, skill, over) {
    const base = ROLE_BASE[role];
    const m = TIER_MULT[tier];
    U.push(Object.assign({
      id, name, en, world, role, tier, cost: tier,
      hp: Math.round(base.hp * m), atk: Math.round(base.atk * m),
      as: base.as, range: base.range, def: base.def, crit: base.crit,
      mana, skill,
    }, over || {}));
  }

  // ---- Emberreach (no support)
  unit('ash_ronin', 'رونين الرماد', 'Ash Ronin', 'ember', 'fighter', 1, 70,
    { type: 'cleave', name: 'قطع الرماد', dmg: [120, 200, 340], radius: 1.2,
      text: 'ضربة دائرية تصيب الهدف ومن حوله.' });
  unit('forge_bulwark', 'حامي الأتون', 'Forge Bulwark', 'ember', 'guardian', 1, 90,
    { type: 'taunt', name: 'تحدّي الحدّاد', shield: [200, 350, 600], radius: 2.2, dur: 3,
      text: 'يجبر الأعداء القريبين على مهاجمته ويكتسب درعًا.' });
  unit('spark_wraith', 'شبح الشرر', 'Spark Wraith', 'ember', 'assassin', 2, 60,
    { type: 'nuke', name: 'طعنة الشرر', dmg: [230, 390, 660],
      text: 'طعنة خاطفة بضرر هائل للهدف.' });
  unit('pyre_archer', 'رامية المحرقة', 'Pyre Archer', 'ember', 'marksman', 2, 80,
    { type: 'burn', name: 'سهم المحرقة', dps: [60, 100, 170], dur: 4,
      text: 'يحرق الهدف ضررًا متواصلًا لمدة 4 ثوانٍ.' });
  unit('caldera_seer', 'عرّاف البركان', 'Caldera Seer', 'ember', 'mage', 3, 90,
    { type: 'aoe', name: 'انفجار الفوهة', dmg: [340, 560, 960], radius: 1.6,
      text: 'انفجار بركاني يصيب منطقة واسعة حول الهدف.' });

  // ---- Moontide (no assassin / marksman)
  unit('wave_caller', 'مستدعية الموج', 'Wave Caller', 'tide', 'support', 1, 60,
    { type: 'healLowest', name: 'موجة شافية', heal: [230, 380, 640],
      text: 'تعالج الحليف الأكثر جرحًا.' });
  unit('coral_sentinel', 'حارس المرجان', 'Coral Sentinel', 'tide', 'guardian', 1, 80,
    { type: 'shieldSelf', name: 'قشرة المرجان', shield: [380, 620, 1000],
      text: 'يكتسب درعًا مرجانيًا سميكًا.' });
  unit('lunar_blade', 'سيّاف القمر', 'Lunar Blade', 'tide', 'fighter', 2, 70,
    { type: 'drain', name: 'خسوف', dmg: [220, 360, 620],
      text: 'ضربة تمتص الحياة وتعالجه بقيمة الضرر.' });
  unit('mist_witch', 'ساحرة الضباب', 'Mist Witch', 'tide', 'mage', 2, 80,
    { type: 'stunAoe', name: 'ضباب متجمّد', dmg: [120, 200, 350], stun: [1.5, 1.8, 2.2], radius: 1.2,
      text: 'تجمّد الهدف ومن حوله وتصيبهم بضرر.' });
  unit('tide_priest', 'كاهن المدّ العالي', 'High Tide Priest', 'tide', 'support', 3, 80,
    { type: 'healAll', name: 'مدّ عظيم', heal: [180, 300, 520],
      text: 'يعالج جميع الحلفاء.' });

  // ---- Neon-9 (no mage)
  unit('grid_hound', 'كلب الشبكة', 'Grid Hound', 'neon', 'assassin', 1, 60,
    { type: 'nuke', name: 'عضّة البيانات', dmg: [150, 260, 450],
      text: 'عضة إلكترونية بضرر عالٍ.' });
  unit('pixel_sniper', 'قناصة البكسل', 'Pixel Sniper', 'neon', 'marksman', 1, 80,
    { type: 'snipe', name: 'تصويب دقيق', dmg: [200, 340, 580],
      text: 'تقنص العدو الأقل صحة أينما كان (ضمن الأهداف المسموحة).' });
  unit('firewall_unit', 'وحدة الجدار الناري', 'Firewall Unit', 'neon', 'guardian', 2, 90,
    { type: 'taunt', name: 'جدار ناري', shield: [260, 430, 720], radius: 2.6, dur: 3,
      text: 'تجذب انتباه الأعداء في نطاق واسع وتكتسب درعًا.' });
  unit('spectral_coder', 'المبرمجة الطيفية', 'Spectral Coder', 'neon', 'support', 2, 90,
    { type: 'hasteAllies', name: 'رفع التردد', pct: [0.3, 0.45, 0.65], dur: 5,
      text: 'تزيد سرعة هجوم جميع الحلفاء مؤقتًا.' });
  unit('chrome_ronin', 'رونين الكروم', 'Chrome Ronin', 'neon', 'fighter', 3, 60,
    { type: 'execute', name: 'قطع نهائي', dmg: [250, 420, 740],
      text: 'ضربة تتضاعف ضد الأهداف تحت 40% صحة.' });

  // ---- Elder Grove (no support)
  unit('moss_warden', 'حارس الطحلب', 'Moss Warden', 'sylvan', 'guardian', 1, 70,
    { type: 'healSelf', name: 'تجدد الطحلب', heal: [240, 400, 680],
      text: 'يستعيد جزءًا كبيرًا من صحته.' });
  unit('thorn_fox', 'ثعلب الأشواك', 'Thorn Fox', 'sylvan', 'fighter', 1, 70,
    { type: 'stunStrike', name: 'وخزة شائكة', dmg: [100, 170, 300], stun: [1, 1.2, 1.5],
      text: 'يصيب الهدف ويشلّه لفترة قصيرة.' });
  unit('willow_eye', 'عين الصفصاف', 'Willow Eye', 'sylvan', 'marksman', 2, 80,
    { type: 'multishot', name: 'وابل الأوراق', dmg: [130, 220, 380], count: 3,
      text: 'تطلق ثلاثة أسهم على أقرب ثلاثة أعداء.' });
  unit('root_shaman', 'شامان الجذور', 'Root Shaman', 'sylvan', 'mage', 3, 90,
    { type: 'stunAoe', name: 'قبضة الجذور', dmg: [220, 370, 650], stun: [1.2, 1.5, 2], radius: 1.6,
      text: 'جذور تقيّد الأعداء في منطقة وتؤذيهم.' });
  unit('wild_stalker', 'المتربّص البري', 'Wild Stalker', 'sylvan', 'assassin', 3, 60,
    { type: 'execute', name: 'انقضاض', dmg: [300, 520, 900],
      text: 'انقضاض قاتل يتضاعف ضد الأهداف الجريحة.' });

  const UNITS = {};
  U.forEach((u) => (UNITS[u.id] = u));

  /*
   * Heroes. `board` = stats when summoned onto the field (hp comes from life).
   * Ability effect types: buffAllies, damageCluster, shieldAllies, healAllies,
   * stunEnemies, frontDR, stunFront. `scale` adds value per round.
   */
  const HEROES = {
    kagira: {
      id: 'kagira', name: 'كيرو', title: 'الجمر الهادئ', world: 'ember', style: 'هجومي — هادئ ومحسوب، ينفجر عند الهجوم: ضغط مبكر وضرر متفجر',
      board: { atk: 85, as: 0.8, range: 1, def: 0.2, crit: 0.1 },
      passive: { id: 'blazing_will', name: 'إرادة متقدة', text: 'عندما يصبح البطل مكشوفًا يكتسب الحلفاء +25% هجوم.' },
      abilities: [
        { id: 'inferno_banner', name: 'أمر الهجوم', cost: 3, type: 'buffAllies', atkPct: 0.3, dur: 6,
          text: '+30% هجوم لجميع الحلفاء لمدة 6 ثوانٍ.' },
        { id: 'meteor', name: 'نيزك الجمر', cost: 4, type: 'damageCluster', dmg: 200, scale: 25, radius: 1.6,
          text: 'نيزك على أكثف تجمع للأعداء (200 + 25 لكل جولة).' },
      ],
    },
    merin: {
      id: 'merin', name: 'ميران', title: 'حارس المدّ الصامت', world: 'tide', style: 'صمود — ظلّ هادئ يحمي الفريق: دروع وعلاج ومعارك طويلة',
      board: { atk: 86, as: 0.8, range: 3, def: 0.1, crit: 0.05 },
      passive: { id: 'deep_reserve', name: 'مخزون عميق', text: '+1 جوهر إضافي كل جولة.' },
      abilities: [
        { id: 'tidal_ward', name: 'حاجز المدّ', cost: 3, type: 'shieldAllies', amount: 200, scale: 25,
          text: 'درع لجميع الحلفاء (200 + 25 لكل جولة).' },
        { id: 'moon_spring', name: 'ينبوع القمر', cost: 4, type: 'healAllies', pct: 0.36,
          text: 'يعالج جميع الحلفاء بنسبة 36% من صحتهم القصوى.' },
      ],
    },
    zerokai: {
      id: 'zerokai', name: 'زيرو-كاي', title: 'الظلّ المشفّر', world: 'neon', style: 'إيقاع — غامض يسبق خصمه بخطوة، اقتصاد مرن وسرعة',
      board: { atk: 74, as: 0.85, range: 4, def: 0.05, crit: 0.15 },
      passive: { id: 'free_reroll', name: 'وصول خلفي', text: 'أول تحديث للمتجر في كل جولة مجاني.' },
      abilities: [
        { id: 'overclock', name: 'كسر السرعة', cost: 3, type: 'buffAllies', asPct: 0.25, dur: 5,
          text: '+25% سرعة هجوم لجميع الحلفاء لمدة 5 ثوانٍ.' },
        { id: 'system_crash', name: 'انهيار النظام', cost: 5, type: 'stunEnemies', dur: 1.5,
          text: 'يشلّ جميع الأعداء لمدة 1.5 ثانية.' },
      ],
    },
    orath: {
      id: 'orath', name: 'أوراث', title: 'الحارس المحلّل', world: 'sylvan', style: 'دفاعي — هادئ وتحليلي يقرأ المعركة قبل أن تبدأ: خط أمامي صلب وتحكم',
      board: { atk: 75, as: 0.65, range: 1, def: 0.3, crit: 0.05 },
      passive: { id: 'ancient_bark', name: 'لحاء صلب', text: 'وحدات الصف الأمامي تكتسب +15% صحة قصوى.' },
      abilities: [
        { id: 'thorn_wall', name: 'جدار الأشواك', cost: 3, type: 'frontDR', dr: 0.35, dur: 6,
          text: 'الصف الأمامي يتلقى ضررًا أقل بـ 35% لمدة 6 ثوانٍ.' },
        { id: 'rootbind', name: 'قيد الجذور', cost: 4, type: 'stunFront', dur: 2, dmg: 100, scale: 15,
          text: 'يقيّد الصف الأمامي للعدو ثانيتين ويصيبه (100 + 15 لكل جولة).' },
      ],
    },
  };

  const ABILITY_TRIGGERS = {
    start: { id: 'start', name: 'بداية القتال' },
    t5: { id: 't5', name: 'بعد 5 ثوانٍ' },
    firstDeath: { id: 'firstDeath', name: 'عند سقوط أول حليف' },
    exposed: { id: 'exposed', name: 'عند انكشاف البطل' },
  };

  // Equipment (attached to a unit) and spells (armed for the next combat).
  const ITEMS = {
    rift_blade: { id: 'rift_blade', kind: 'equip', name: 'نصل الصدع', cost: 3, icon: 'sword',
      effects: [{ stat: 'atkPct', value: 0.25 }], text: '+25% هجوم.' },
    star_plate: { id: 'star_plate', kind: 'equip', name: 'درع النجم', cost: 3, icon: 'shield',
      effects: [{ stat: 'hpPct', value: 0.3 }, { stat: 'dr', value: 0.05 }], text: '+30% صحة، +5% تقليل ضرر.' },
    swift_charm: { id: 'swift_charm', kind: 'equip', name: 'تميمة الريح', cost: 3, icon: 'wind',
      effects: [{ stat: 'asPct', value: 0.25 }], text: '+25% سرعة هجوم.' },
    mana_prism: { id: 'mana_prism', kind: 'equip', name: 'موشور المانا', cost: 3, icon: 'orb',
      effects: [{ stat: 'startMana', value: 40 }, { stat: 'skillPower', value: 0.1 }], text: '+40 مانا ابتدائية، +10% قوة مهارة.' },
    vamp_fang: { id: 'vamp_fang', kind: 'equip', name: 'ناب الظل', cost: 3, icon: 'fang',
      effects: [{ stat: 'lifesteal', value: 0.2 }], text: '20% سرقة حياة.' },
    hawk_scope: { id: 'hawk_scope', kind: 'equip', name: 'منظار الصقر', cost: 3, icon: 'eye',
      effects: [{ stat: 'range', value: 1 }, { stat: 'crit', value: 0.15 }], text: '+1 مدى، +15% فرصة ضربة حرجة.' },

    war_hymn: { id: 'war_hymn', kind: 'spell', name: 'ترنيمة الحرب', cost: 2, icon: 'note',
      spell: { type: 'buffAll', atkPct: 0.2 }, text: 'القتال القادم: +20% هجوم لجميع الحلفاء.' },
    rift_ward: { id: 'rift_ward', kind: 'spell', name: 'حاجز الصدع', cost: 2, icon: 'shield',
      spell: { type: 'shieldFront', amount: 260 }, text: 'القتال القادم: درع 260 للصف الأمامي.' },
    dim_meteor: { id: 'dim_meteor', kind: 'spell', name: 'نيزك الأبعاد', cost: 3, icon: 'star',
      spell: { type: 'hitBack', dmg: 240, at: 3 }, text: 'القتال القادم: بعد 3 ثوانٍ يصيب الصف الخلفي للعدو بـ 240 ضرر.' },
    time_wind: { id: 'time_wind', kind: 'spell', name: 'ريح الزمن', cost: 2, icon: 'wind',
      spell: { type: 'hasteAll', asPct: 0.25, dur: 8 }, text: 'القتال القادم: +25% سرعة هجوم أول 8 ثوانٍ.' },
  };

  /*
   * Synergies. Counted by UNIQUE units on the board (duplicates don't stack).
   * World synergies affect members; role synergies mostly members.
   * `convergence` rewards mixing worlds so mixed teams are not weaker.
   */
  const SYNERGIES = {
    ember: { id: 'ember', kind: 'world', name: 'مملكة الجمر', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'atkPct', value: 0.15 }], text: 'أعضاء الجمر +15% هجوم' },
      { n: 4, effects: [{ scope: 'members', stat: 'atkPct', value: 0.35 }], text: 'أعضاء الجمر +35% هجوم' }] },
    tide: { id: 'tide', kind: 'world', name: 'المدّ القمري', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'startShieldPct', value: 0.22 }], text: 'أعضاء المدّ يبدؤون بدرع 22%' },
      { n: 4, effects: [{ scope: 'members', stat: 'startShieldPct', value: 0.4 }, { scope: 'members', stat: 'regenPct', value: 0.02 }], text: 'درع 40% + تجدد 2%/ث' }] },
    neon: { id: 'neon', kind: 'world', name: 'نيون-٩', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'asPct', value: 0.18 }], text: 'أعضاء نيون +18% سرعة هجوم' },
      { n: 4, effects: [{ scope: 'members', stat: 'asPct', value: 0.4 }], text: 'أعضاء نيون +40% سرعة هجوم' }] },
    sylvan: { id: 'sylvan', kind: 'world', name: 'الغابة الأزلية', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'hpPct', value: 0.2 }], text: 'أعضاء الغابة +20% صحة' },
      { n: 4, effects: [{ scope: 'members', stat: 'hpPct', value: 0.45 }], text: 'أعضاء الغابة +45% صحة' }] },

    guardian: { id: 'guardian', kind: 'role', name: 'الحرّاس', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'dr', value: 0.15 }], text: 'الحراس +15% تقليل ضرر' },
      { n: 4, effects: [{ scope: 'members', stat: 'dr', value: 0.25 }, { scope: 'all', stat: 'dr', value: 0.08 }], text: 'الحراس +25%، الجميع +8% تقليل ضرر' }] },
    fighter: { id: 'fighter', kind: 'role', name: 'المقاتلون', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'lifesteal', value: 0.15 }], text: 'المقاتلون 15% سرقة حياة' },
      { n: 4, effects: [{ scope: 'members', stat: 'lifesteal', value: 0.3 }, { scope: 'members', stat: 'atkPct', value: 0.1 }], text: '30% سرقة حياة +10% هجوم' }] },
    assassin: { id: 'assassin', kind: 'role', name: 'القتلة', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'crit', value: 0.15 }, { scope: 'members', stat: 'critDmg', value: 0.3 }], text: '+15% حرجة، +30% ضرر حرج' },
      { n: 3, effects: [{ scope: 'members', stat: 'crit', value: 0.3 }, { scope: 'members', stat: 'critDmg', value: 0.6 }], text: '+30% حرجة، +60% ضرر حرج' }] },
    mage: { id: 'mage', kind: 'role', name: 'السحرة', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'skillPower', value: 0.35 }, { scope: 'members', stat: 'startMana', value: 30 }], text: '+35% قوة مهارة، +30 مانا' },
      { n: 3, effects: [{ scope: 'members', stat: 'skillPower', value: 0.7 }, { scope: 'members', stat: 'startMana', value: 50 }], text: '+70% قوة مهارة، +50 مانا' }] },
    marksman: { id: 'marksman', kind: 'role', name: 'القناصة', tiers: [
      { n: 2, effects: [{ scope: 'members', stat: 'atkPct', value: 0.15 }, { scope: 'members', stat: 'range', value: 1 }], text: '+15% هجوم، +1 مدى' },
      { n: 3, effects: [{ scope: 'members', stat: 'atkPct', value: 0.35 }, { scope: 'members', stat: 'range', value: 1 }], text: '+35% هجوم، +1 مدى' }] },
    support: { id: 'support', kind: 'role', name: 'الداعمون', tiers: [
      { n: 2, effects: [{ scope: 'all', stat: 'regenPct', value: 0.015 }], text: 'جميع الحلفاء يتجددون 1.5%/ث' },
      { n: 3, effects: [{ scope: 'all', stat: 'regenPct', value: 0.03 }], text: 'جميع الحلفاء يتجددون 3%/ث' }] },

    convergence: { id: 'convergence', kind: 'special', name: 'تقارب العوالم', countBy: 'worlds', tiers: [
      { n: 3, effects: [{ scope: 'all', stat: 'atkPct', value: 0.1 }, { scope: 'all', stat: 'hpPct', value: 0.1 }], text: '3 عوالم: الجميع +10% هجوم وصحة' },
      { n: 4, effects: [{ scope: 'all', stat: 'atkPct', value: 0.2 }, { scope: 'all', stat: 'hpPct', value: 0.2 }], text: '4 عوالم: الجميع +20% هجوم وصحة' }] },
  };

  /*
   * Stage rewards: after each of the first 3 stages every player drafts 1 of 3 offers.
   * values are per stage [stage 1, stage 2, stage 3]. kind -> effect in core/match.js (claimReward).
   */
  const REWARDS = {
    unit:     { id: 'unit', icon: 'crown', name: 'مجنّد مجاني', tiers: [1, 2, 3], text: (v, st) => `وحدة فئة ${v.tiers[st]} مجانًا (من عالم بطلك غالبًا)` },
    gold:     { id: 'gold', icon: 'coin', name: 'كنز', n: [6, 8, 10], text: (v, st) => `+${v.n[st]} ذهب فورًا` },
    xp:       { id: 'xp', icon: 'star', name: 'تدريب مكثّف', n: [6, 8, 10], text: (v, st) => `+${v.n[st]} خبرة` },
    essence:  { id: 'essence', icon: 'essence', name: 'جوهر نقي', n: [3, 3, 4], text: (v, st) => `+${v.n[st]} جوهر لقدرات البطل` },
    item:     { id: 'item', icon: 'shield', name: 'غنيمة', text: () => 'معدة عشوائية تضعها على أي وحدة' },
    bless_atk:{ id: 'bless_atk', icon: 'sword', name: 'بركة الغضب', pct: [0.08, 0.1, 0.12], text: (v, st) => `الفريق كله +${Math.round(v.pct[st] * 100)}% هجوم لبقية المباراة` },
    bless_hp: { id: 'bless_hp', icon: 'heart', name: 'بركة الحجر', pct: [0.1, 0.12, 0.15], text: (v, st) => `الفريق كله +${Math.round(v.pct[st] * 100)}% صحة لبقية المباراة` },
    bless_as: { id: 'bless_as', icon: 'wind', name: 'بركة الريح', pct: [0.08, 0.1, 0.12], text: (v, st) => `الفريق كله +${Math.round(v.pct[st] * 100)}% سرعة هجوم لبقية المباراة` },
    heal:     { id: 'heal', icon: 'cross', name: 'ماء الحياة', n: [10, 12, 15], text: (v, st) => `يستعيد بطلك ${v.n[st]} حياة` },
  };
  // which rewards can appear in each stage (one "unit" is always offered)
  const REWARD_POOLS = [
    ['gold', 'xp', 'item', 'bless_hp'],
    ['item', 'essence', 'bless_atk', 'bless_hp', 'xp'],
    ['bless_atk', 'bless_hp', 'bless_as', 'heal', 'xp', 'essence'],
  ];

  AMB.DATA = { REWARDS, REWARD_POOLS, WORLDS, ROLES, ROLE_BASE, TIER_MULT, UNITS, HEROES, ITEMS, SYNERGIES, ABILITY_TRIGGERS };
})();
