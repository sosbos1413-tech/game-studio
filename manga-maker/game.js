// صانع المانجا — المنطق + الواجهة
// =====================================================================
// CONFIG — كل أرقام التوازن هنا. عدّل وأعد تحميل الصفحة.
// =====================================================================
const CONFIG = {
  // --- السلسلة والوقت ---
  totalWeeks: 10,          // عدد أسابيع السلسلة
  drawSeconds: 45,         // مؤقت مرحلة الرسم
  poolSize: 7,             // كم بطاقة تنسحب من الكومة كل أسبوع
  optionsPerPick: 3,       // كم خيار يظهر كل مرة
  picksPerWeek: 5,         // كم بطاقة يختار اللاعب (والخانات 4 → وحدة احتياط)

  // --- الكومبوهات ---
  comboTrainBattle: 2,     // تدريب ← معركة: مضاعف مجموع البطاقتين
  comboVillainBattleCliff: 3, // شرير ← معركة ← كليف: مضاعف مجموع الثلاث
  comboLaughTear: 2,       // ضحكة ← دمعة: مضاعف مجموع البطاقتين
  cliffEndingBonus: 3,     // كليف هانقر في "نهاية الفصل"
  repeatPenalty: -2,       // نفس النوع في خانتين متتاليتين
  boredWeeks: 3,           // كم أسبوع متتالي لنفس النوع المسيطر قبل الملل
  boredMultiplier: 0.7,    // "القرّاء ملّوا" = -30%

  // --- القرّاء والنمو ---
  startReaders: 12000,
  neutralHype: 10,         // حماس "عادي" لا يزيد ولا ينقص القرّاء
  growthPerHype: 0.012,    // كل نقطة حماس فوق/تحت المحايد = ±1.2% قرّاء
  minGrowth: -0.25,        // أقصى خسارة أسبوعية
  maxGrowth: 0.40,         // أقصى نمو أسبوعي
  hypeRankWeight: 400,     // وزن "حماس هذا الأسبوع" في الترتيب (نقاط ترتيب لكل نقطة حماس)

  // --- المنافس ---
  rivalHypeMin: 8,         // نطاق حماس المنافس في الأسبوع 1
  rivalHypeMax: 16,
  rivalGrowthPerWeek: 2,   // يزيد النطاق كل أسبوع
  rivalWinBonus: 0.10,     // +10% قرّاء
  rivalLosePenalty: -0.10, // -10% قرّاء

  // --- السلاسل الوهمية ---
  fakeReadersMin: 6000,
  fakeReadersMax: 32000,
  fakeQualityMin: 9,       // متوسط حماس السلسلة الوهمية (يتوزع بين min/max)
  fakeQualityMax: 20,
  fakeHypeSpread: 6,       // تذبذب حماسها الأسبوعي ±

  // --- النهاية ---
  cancelRankFrom: 8,       // المراكز من 8 وتحت تعتبر خطر
  cancelStreak: 3,         // كم أسبوع متتالي بالخطر = إلغاء
  animeTopRank: 3,         // أفضل 3 بالنهاية = صفقة أنمي

  // --- مستويات التعليقات وعداد الحماس ---
  weakBelow: 12,           // أقل من كذا = تعليقات ضعيفة
  fireFrom: 26,            // من كذا وفوق = ناري
  hypeMeterMax: 50,        // سقف عداد الحماس بالعرض

  // --- توقيت الأنيميشن (ms) ---
  comboRevealMs: 1100,
  publishMs: 3500,
  rivalMs: 1600,
  rankStepMs: 380,
};

// =====================================================================
// المنطق البحت (بدون DOM) — قابل للاختبار في Node
// =====================================================================

// يحسب نتيجة فصل: slots = 4 بطاقات بالترتيب، prevDominants = أنواع مسيطرة للأسابيع السابقة (الأحدث آخر)
function scoreChapter(slots, prevDominants = [], cfg = CONFIG) {
  const combos = [];  // {key, label, slots:[idx], bonus}
  const base = slots.reduce((s, c) => s + c.hype, 0);
  const t = slots.map(c => c.type);
  const sumOf = idxs => idxs.reduce((s, i) => s + slots[i].hype, 0);

  const addMult = (key, label, idxs, mult) => {
    const bonus = Math.round(sumOf(idxs) * (mult - 1));
    combos.push({ key, label, slots: idxs, bonus, mult });
  };

  // شرير ← معركة ← كليف (×3)
  for (let i = 0; i + 2 < t.length; i++) {
    if (t[i] === 'villain' && t[i + 1] === 'battle' && t[i + 2] === 'cliff') {
      addMult('vbc', `😈⚔️❗ ثلاثية الدمار ×${cfg.comboVillainBattleCliff}`, [i, i + 1, i + 2], cfg.comboVillainBattleCliff);
    }
  }
  for (let i = 0; i + 1 < t.length; i++) {
    if (t[i] === 'train' && t[i + 1] === 'battle') {
      addMult('tb', `💪⚔️ ثمرة التدريب ×${cfg.comboTrainBattle}`, [i, i + 1], cfg.comboTrainBattle);
    }
    if (t[i] === 'laugh' && t[i + 1] === 'tear') {
      addMult('lt', `😂😢 تقلّب المشاعر ×${cfg.comboLaughTear}`, [i, i + 1], cfg.comboLaughTear);
    }
    if (t[i] === t[i + 1] && t[i] !== 'boring') {
      combos.push({ key: 'rep', label: `🔁 تكرار ممل ${cfg.repeatPenalty}`, slots: [i, i + 1], bonus: cfg.repeatPenalty });
    }
  }
  const last = t.length - 1;
  if (t[last] === 'cliff') {
    combos.push({ key: 'cliffEnd', label: `❗ نهاية معلّقة +${cfg.cliffEndingBonus}`, slots: [last], bonus: cfg.cliffEndingBonus });
  }

  let total = base + combos.reduce((s, c) => s + c.bonus, 0);

  // النوع المسيطر = أعلى مجموع حماس (التعادل: الأكثر عدداً ثم الأسبق بالصفحة)
  const dominant = dominantType(slots);
  const recent = prevDominants.slice(-(cfg.boredWeeks - 1));
  const bored = dominant !== null &&
    recent.length === cfg.boredWeeks - 1 &&
    recent.every(d => d === dominant);
  if (bored) total = total * cfg.boredMultiplier;

  total = Math.max(0, Math.round(total));
  return { base, combos, dominant, bored, total };
}

function dominantType(slots) {
  const agg = {};
  slots.forEach((c, i) => {
    if (c.type === 'boring') return;
    agg[c.type] = agg[c.type] || { hype: 0, count: 0, first: i };
    agg[c.type].hype += c.hype;
    agg[c.type].count++;
  });
  const keys = Object.keys(agg);
  if (!keys.length) return null;
  keys.sort((a, b) => agg[b].hype - agg[a].hype || agg[b].count - agg[a].count || agg[a].first - agg[b].first);
  return keys[0];
}

function growthRate(hype, cfg = CONFIG) {
  const g = (hype - cfg.neutralHype) * cfg.growthPerHype;
  return Math.min(cfg.maxGrowth, Math.max(cfg.minGrowth, g));
}

function rivalRange(week, cfg = CONFIG) {
  const add = (week - 1) * cfg.rivalGrowthPerWeek;
  return [cfg.rivalHypeMin + add, cfg.rivalHypeMax + add];
}

function commentLevel(hype, cfg = CONFIG) {
  if (hype < cfg.weakBelow) return 'weak';
  if (hype >= cfg.fireFrom) return 'fire';
  return 'mid';
}

// يرجع: 'cancel' | 'anime' | 'quiet' | null (السلسلة مستمرة)
function checkEnding(ranks, week, cfg = CONFIG) {
  if (ranks.length >= cfg.cancelStreak &&
      ranks.slice(-cfg.cancelStreak).every(r => r >= cfg.cancelRankFrom)) return 'cancel';
  if (week >= cfg.totalWeeks) return ranks[ranks.length - 1] <= cfg.animeTopRank ? 'anime' : 'quiet';
  return null;
}

const randInt = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function makeFakeSeries(cfg = CONFIG) {
  const n = FAKE_SERIES.length;
  return shuffle(FAKE_SERIES).map((name, i) => ({
    name,
    fake: true,
    readers: Math.round(cfg.fakeReadersMin + (cfg.fakeReadersMax - cfg.fakeReadersMin) * (i / (n - 1)) * (0.85 + Math.random() * 0.3)),
    quality: cfg.fakeQualityMin + Math.random() * (cfg.fakeQualityMax - cfg.fakeQualityMin),
    hype: 0,
  }));
}

function advanceFake(s, cfg = CONFIG) {
  s.hype = Math.max(1, Math.round(s.quality + randInt(-cfg.fakeHypeSpread, cfg.fakeHypeSpread)));
  s.readers = Math.round(s.readers * (1 + growthRate(s.hype, cfg)));
}

const rankScore = (s, cfg = CONFIG) => s.readers + s.hype * cfg.hypeRankWeight;

// تصدير لاختبارات Node
if (typeof module !== 'undefined') {
  module.exports = { CONFIG, scoreChapter, dominantType, growthRate, rivalRange, commentLevel, checkEnding, makeFakeSeries, advanceFake, rankScore };
}

// =====================================================================
// الواجهة
// =====================================================================
if (typeof document !== 'undefined') (function () {
  const $ = sel => document.querySelector(sel);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fmt = n => Math.round(n).toLocaleString('ar-SA');
  const STORE_KEY = 'mangaMaker.v1';

  let uid = 0;
  const cardInst = c => ({ ...c, icon: c.icon || CARD_TYPES[c.type].icon, uid: ++uid });

  let S = null; // حالة السلسلة الحالية

  // ---------- التخزين ----------
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveStore(st) { try { localStorage.setItem(STORE_KEY, JSON.stringify(st)); } catch (e) {} }

  // ---------- الشاشات ----------
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  }

  function renderStart() {
    const st = loadStore();
    const parts = [`📚 عدد السلاسل: <b>${st.seriesCount || 0}</b>`];
    if (st.bestRank) parts.push(`🏆 أفضل ترتيب نهائي: <b>#${st.bestRank}</b>`);
    if (st.bestHype) parts.push(`🔥 أعلى حماس فصل: <b>${st.bestHype}</b>`);
    if (st.animeDeals) parts.push(`🎬 صفقات أنمي: <b>${st.animeDeals}</b>`);
    $('#start-stats').innerHTML = parts.join('<br>');
    show('screen-start');
  }

  function newSeries() {
    const name = ($('#series-name').value || '').trim() || 'مانجا بلا اسم';
    S = {
      name,
      week: 0,
      readers: CONFIG.startReaders,
      fakes: makeFakeSeries(),
      dominants: [],
      ranks: [],
      chapters: [],      // {week, hype, cards, rank}
      topCombo: null,    // {label, bonus, week}
    };
    $('#hud-name').textContent = name;
    show('screen-game');
    startWeek();
  }

  // ---------- مرحلة الرسم ----------
  function startWeek() {
    S.week++;
    S.pool = shuffle(CARDS).slice(0, CONFIG.poolSize).map(cardInst);
    S.options = [];
    S.picks = 0;
    S.hand = [];
    S.slots = Array(SLOT_NAMES.length).fill(null);
    S.selected = null;
    S.locked = false;
    S.timeLeft = CONFIG.drawSeconds;
    $('#phase-draw').hidden = false;
    $('#phase-publish').hidden = true;
    $('#page').classList.remove('published');
    $('#screen-game').classList.remove('publishing');
    $('#screen-game').scrollTop = 0;
    nextOptions();
    updateHud();
    renderDraw();
    clearInterval(S.timer);
    S.timer = setInterval(tick, 1000);
    renderTimer();
  }

  function tick() {
    if (S.locked) return;
    S.timeLeft--;
    renderTimer();
    if (S.timeLeft <= 0) publish(true);
  }

  function renderTimer() {
    const el = $('#timer');
    el.textContent = S.timeLeft;
    el.classList.toggle('danger', S.timeLeft <= 10);
    $('#timer-bar').style.width = (100 * S.timeLeft / CONFIG.drawSeconds) + '%';
  }

  function nextOptions() {
    // الخيارات اللي ما انختارت ترجع للكومة
    S.pool.push(...S.options);
    S.options = [];
    if (S.picks >= CONFIG.picksPerWeek) return;
    S.pool = shuffle(S.pool);
    S.options = S.pool.splice(0, Math.min(CONFIG.optionsPerPick, S.pool.length));
  }

  function updateHud() {
    $('#hud-week').textContent = `الأسبوع ${S.week}/${CONFIG.totalWeeks}`;
    $('#hud-readers').textContent = `👥 ${fmt(S.readers)}`;
    const r = S.ranks[S.ranks.length - 1];
    $('#hud-rank').textContent = r ? `#${r}` : '—';
  }

  const seenUids = new Set(); // عشان الأنيميشن يشتغل للبطاقات الجديدة بس
  function cardHTML(c, extra = '') {
    const isNew = !seenUids.has(c.uid);
    seenUids.add(c.uid);
    return `<div class="card t-${c.type} ${extra} ${isNew ? 'new' : ''}" data-uid="${c.uid}">
      <span class="c-icon">${c.icon}</span>
      <span class="c-name">${c.name}</span>
      <span class="c-type">${CARD_TYPES[c.type] ? CARD_TYPES[c.type].name : ''}</span>
      <span class="c-hype">${c.hype}</span>
    </div>`;
  }

  function renderDraw() {
    const remaining = CONFIG.picksPerWeek - S.picks;
    $('#draft-label').textContent = remaining > 0
      ? `اختر بطاقة (${remaining} باقي) — اسحبها للصفحة أو اضغطها`
      : 'رتّب بطاقاتك في الصفحة 👇';
    $('#options').innerHTML = S.options.map(c => cardHTML(c, sel(c))).join('');
    $('#options').classList.toggle('empty', !S.options.length);
    $('#hand').innerHTML = S.hand.length
      ? S.hand.map(c => cardHTML(c, sel(c))).join('')
      : '<span class="hint">يدك فاضية</span>';

    $('#page').innerHTML = S.slots.map((c, i) => `
      <div class="slot ${c ? 'filled' : ''}" data-slot="${i}">
        <span class="slot-label">${SLOT_NAMES[i]}</span>
        ${c ? cardHTML(c, sel(c)) : '<span class="slot-empty">＋</span>'}
      </div>`).join('');

    renderPreview();
  }
  const sel = c => (S.selected === c.uid ? 'selected' : '');

  function renderPreview() {
    const filled = S.slots.filter(Boolean);
    const box = $('#preview');
    if (!filled.length) { box.innerHTML = '<span class="hint">الكومبوهات تظهر هنا وأنت ترتّب</span>'; return; }
    const res = scoreChapter(S.slots.map(c => c || BORING_CARD), S.dominants);
    const tags = res.combos.map(c => `<span class="tag ${c.bonus < 0 ? 'neg' : ''}">${c.label}</span>`);
    if (res.bored) tags.push(`<span class="tag neg">🥱 القرّاء ملّوا من ${CARD_TYPES[res.dominant].name} -30%</span>`);
    else if (res.dominant && S.dominants.slice(-(CONFIG.boredWeeks - 1)).filter(d => d === res.dominant).length === CONFIG.boredWeeks - 1)
      tags.push('<span class="tag neg">⚠️</span>');
    box.innerHTML = `<b class="pv-total">🔥 ${res.total}</b> ${tags.join('')}`;
  }

  // ---------- نقل البطاقات ----------
  function locate(uidNum) {
    let i = S.options.findIndex(c => c.uid === uidNum);
    if (i >= 0) return { zone: 'opt', i };
    i = S.hand.findIndex(c => c.uid === uidNum);
    if (i >= 0) return { zone: 'hand', i };
    i = S.slots.findIndex(c => c && c.uid === uidNum);
    if (i >= 0) return { zone: 'slot', i };
    return null;
  }

  // target: {zone:'slot', i} | {zone:'hand'}
  function moveCard(uidNum, target) {
    if (S.locked) return;
    const src = locate(uidNum);
    if (!src) return;
    let card;
    if (src.zone === 'opt') {
      card = S.options[src.i];
      S.options.splice(src.i, 1);
      S.picks++;
      nextOptions();
    } else if (src.zone === 'hand') {
      card = S.hand.splice(src.i, 1)[0];
    } else {
      card = S.slots[src.i];
      S.slots[src.i] = null;
    }

    if (target.zone === 'slot') {
      const prev = S.slots[target.i];
      S.slots[target.i] = card;
      if (prev) {
        if (src.zone === 'slot') S.slots[src.i] = prev;       // تبديل بين خانتين
        else if (src.zone === 'hand') S.hand.splice(src.i, 0, prev);
        else S.hand.push(prev);
      }
    } else {
      S.hand.push(card);
    }
    S.selected = null;
    if (navigator.vibrate) navigator.vibrate(8);
    renderDraw();
  }

  // ---------- السحب واللمس (Pointer Events) ----------
  let drag = null;

  function onPointerDown(e) {
    if (S && S.locked) return;
    const cardEl = e.target.closest('#screen-game .card');
    const slotEl = e.target.closest('.slot');
    if (!cardEl) {
      // ضغطة على خانة فاضية أو اليد بعد اختيار بطاقة
      if (S && S.selected) {
        if (slotEl) moveCard(S.selected, { zone: 'slot', i: +slotEl.dataset.slot });
        else if (e.target.closest('#hand')) moveCard(S.selected, { zone: 'hand' });
      }
      return;
    }
    e.preventDefault();
    const r = cardEl.getBoundingClientRect();
    drag = { uid: +cardEl.dataset.uid, el: cardEl, x0: e.clientX, y0: e.clientY, dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, ghost: null, slotEl };
  }

  function onPointerMove(e) {
    if (!drag) return;
    const dist = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
    if (!drag.ghost && dist > 8) {
      drag.ghost = drag.el.cloneNode(true);
      drag.ghost.classList.add('ghost');
      drag.ghost.style.width = drag.w + 'px';
      document.body.appendChild(drag.ghost);
      drag.el.classList.add('dragging');
    }
    if (drag.ghost) {
      drag.ghost.style.left = (e.clientX - drag.dx) + 'px';
      drag.ghost.style.top = (e.clientY - drag.dy) + 'px';
      document.querySelectorAll('.slot.over, #hand.over').forEach(x => x.classList.remove('over'));
      const t = dropTargetAt(e.clientX, e.clientY);
      if (t) t.el.classList.add('over');
    }
  }

  function dropTargetAt(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const slot = el.closest('.slot');
    if (slot) return { el: slot, target: { zone: 'slot', i: +slot.dataset.slot } };
    const hand = el.closest('#hand');
    if (hand) return { el: hand, target: { zone: 'hand' } };
    return null;
  }

  function onPointerUp(e) {
    if (!drag) return;
    const d = drag; drag = null;
    document.querySelectorAll('.slot.over, #hand.over').forEach(x => x.classList.remove('over'));
    if (d.ghost) {
      d.ghost.remove();
      d.el.classList.remove('dragging');
      const t = dropTargetAt(e.clientX, e.clientY);
      const src = locate(d.uid);
      if (t) moveCard(d.uid, t.target);
      else if (src && src.zone === 'opt') moveCard(d.uid, { zone: 'hand' }); // سحب خيار لأي مكان = اختياره
      return;
    }
    // ضغطة (بدون سحب)
    const src = locate(d.uid);
    if (!src) return;
    if (src.zone === 'opt') { moveCard(d.uid, firstEmptySlot()); return; }
    if (S.selected && S.selected !== d.uid && src.zone === 'slot') { moveCard(S.selected, { zone: 'slot', i: src.i }); return; }
    if (S.selected === d.uid) { S.selected = null; renderDraw(); return; }
    if (src.zone === 'hand' && !S.selected) {
      const empty = firstEmptySlot();
      if (empty.zone === 'slot') { moveCard(d.uid, empty); return; }
    }
    S.selected = d.uid;
    renderDraw();
  }

  function firstEmptySlot() {
    const i = S.slots.findIndex(s => !s);
    return i >= 0 ? { zone: 'slot', i } : { zone: 'hand' };
  }

  // ---------- مرحلة النشر ----------
  async function publish(timeUp = false) {
    if (S.locked) return;
    S.locked = true;
    clearInterval(S.timer);
    S.selected = null;

    if (timeUp) flash('⏰ انتهى الوقت!');
    S.slots = S.slots.map(c => c || cardInst(BORING_CARD));
    renderDraw();
    $('#page').classList.add('published');
    $('#screen-game').classList.add('publishing');
    $('#phase-draw').hidden = true;

    const res = scoreChapter(S.slots, S.dominants);
    S.dominants.push(res.dominant);

    // 1) كشف الكومبوهات
    const slotEls = [...document.querySelectorAll('.slot')];
    for (const c of res.combos) {
      c.slots.forEach(i => slotEls[i].classList.add(c.bonus < 0 ? 'combo-neg' : 'combo-hit'));
      comboPop(c.label, c.bonus < 0);
      if (c.bonus > 0) shake();
      if (c.bonus > 0 && (!S.topCombo || c.bonus > S.topCombo.bonus)) S.topCombo = { label: c.label, bonus: c.bonus, week: S.week };
      await sleep(CONFIG.comboRevealMs * 0.6);
    }
    if (res.bored) { comboPop(`🥱 القرّاء ملّوا من ${CARD_TYPES[res.dominant].name}! -30%`, true); await sleep(CONFIG.comboRevealMs * 0.6); }
    if (!res.combos.length && !res.bored) await sleep(300);

    // 2) عداد الحماس + التعليقات
    $('#phase-publish').hidden = false;
    $('#rival-box').hidden = true;
    $('#ranking').hidden = true;
    $('#btn-next').hidden = true;
    await runMeter(res.total);

    // 3) المنافس
    const [rmin, rmax] = rivalRange(S.week);
    const rivalHype = randInt(rmin, rmax);
    const growth = growthRate(res.total);
    S.readers *= (1 + growth);
    const won = res.total > rivalHype;
    S.readers *= 1 + (won ? CONFIG.rivalWinBonus : CONFIG.rivalLosePenalty);
    S.readers = Math.round(S.readers);
    const rb = $('#rival-box');
    rb.hidden = false;
    rb.className = 'rival ' + (won ? 'won' : 'lost');
    rb.innerHTML = `<div class="rv-row"><span>${RIVAL.icon} ${RIVAL.name}</span><b>${rivalHype}</b></div>
      <div class="rv-row"><span>📖 ${S.name}</span><b>${res.total}</b></div>
      <div class="rv-result">${won ? 'سحقناهم! +10% قرّاء 💥' : 'غلبونا هالمرة... -10% قرّاء 💀'}</div>
      <div class="rv-readers">👥 ${fmt(S.readers)} قارئ (${growth >= 0 ? '+' : ''}${Math.round(growth * 100)}% من الحماس)</div>`;
    if (won) shake();
    updateHud();
    await sleep(CONFIG.rivalMs);

    // 4) الترتيب
    S.fakes.forEach(f => advanceFake(f));
    const me = { name: S.name, readers: S.readers, hype: res.total, me: true };
    const table = [...S.fakes, me].sort((a, b) => rankScore(b) - rankScore(a));
    const myRank = table.indexOf(me) + 1;
    S.ranks.push(myRank);
    S.chapters.push({ week: S.week, hype: res.total, cards: S.slots.map(c => c.icon).join(''), rank: myRank });
    await revealRanking(table);
    updateHud();

    // 5) نهاية؟
    const ending = checkEnding(S.ranks, S.week);
    const btn = $('#btn-next');
    btn.hidden = false;
    if (ending) {
      btn.textContent = 'شوف المصير... 📜';
      btn.onclick = () => endSeries(ending);
    } else {
      const danger = S.ranks.slice(-(CONFIG.cancelStreak - 1)).every(r => r >= CONFIG.cancelRankFrom) && S.ranks.length >= CONFIG.cancelStreak - 1;
      btn.textContent = danger ? '⚠️ المحرر معصّب... الأسبوع الجاي' : 'الأسبوع الجاي ▶';
      btn.onclick = startWeek;
    }
  }

  async function runMeter(total) {
    const fill = $('#meter-fill'), num = $('#meter-num');
    const level = commentLevel(total);
    $('#meter').className = 'meter lvl-' + level;
    fill.style.width = '0%';
    num.textContent = '0';
    const pool = shuffle(COMMENTS[level]);
    const nComments = level === 'fire' ? 6 : level === 'mid' ? 4 : 3;
    const t0 = performance.now();
    let shown = 0;
    await new Promise(resolve => {
      function frame(now) {
        const p = Math.min(1, (now - t0) / CONFIG.publishMs);
        const eased = 1 - Math.pow(1 - p, 3);
        const v = total * eased;
        num.textContent = Math.round(v);
        fill.style.width = Math.min(100, 100 * v / CONFIG.hypeMeterMax) + '%';
        if (shown < nComments && p > shown / nComments) { flyComment(pool[shown % pool.length], level); shown++; }
        if (p < 1) requestAnimationFrame(frame); else resolve();
      }
      requestAnimationFrame(frame);
    });
    if (level === 'fire') shake();
  }

  function flyComment(text, level) {
    const el = document.createElement('div');
    el.className = 'bubble lvl-' + level;
    el.textContent = text;
    el.style.top = (12 + Math.random() * 55) + '%';
    el.style.setProperty('--tilt', (Math.random() * 8 - 4) + 'deg');
    el.style.animationDuration = (2.6 + Math.random() * 1.2) + 's';
    $('#fx').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  async function revealRanking(table) {
    const box = $('#ranking');
    box.hidden = false;
    box.innerHTML = '<div class="rk-title">📊 ترتيب المجلة</div>' +
      table.map((s, i) => `<div class="rk-row hidden-row ${s.me ? 'me' : ''}" data-r="${i}">
        <span class="rk-pos">${i + 1}</span><span class="rk-name">${s.name}</span>
        <span class="rk-val">👥 ${fmt(s.readers)} · 🔥${s.hype}</span></div>`).join('');
    const rows = [...box.querySelectorAll('.rk-row')];
    for (let i = rows.length - 1; i >= 0; i--) {
      rows[i].classList.remove('hidden-row');
      rows[i].classList.add('revealed');
      if (table[i].me) { shake(); rows[i].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      await sleep(i < 3 ? CONFIG.rankStepMs * 1.8 : CONFIG.rankStepMs);
    }
  }

  // ---------- مؤثرات ----------
  function shake() {
    const g = $('#screen-game');
    g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
    if (navigator.vibrate) navigator.vibrate(30);
  }
  function comboPop(text, neg) {
    const el = document.createElement('div');
    el.className = 'combo-pop' + (neg ? ' neg' : '');
    el.textContent = text;
    $('#fx').appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }
  function flash(text) { comboPop(text, true); }

  // ---------- النهاية ----------
  function endSeries(ending) {
    const st = loadStore();
    const best = S.chapters.reduce((a, b) => (b.hype > a.hype ? b : a), S.chapters[0]);
    const bestRank = Math.min(...S.ranks);
    const finalRank = S.ranks[S.ranks.length - 1];
    st.seriesCount = (st.seriesCount || 0) + 1;
    if (ending !== 'cancel' && (!st.bestRank || finalRank < st.bestRank)) st.bestRank = finalRank;
    st.bestHype = Math.max(st.bestHype || 0, best.hype);
    st.bestReaders = Math.max(st.bestReaders || 0, S.readers);
    if (ending === 'anime') st.animeDeals = (st.animeDeals || 0) + 1;
    saveStore(st);

    const TITLES = {
      cancel: { cls: 'end-cancel', icon: '🥀', title: 'تم إلغاء السلسلة', sub: `"${S.name}" توقفت بعد ${S.week} أسابيع... المحرر ما عاد يرد على اتصالاتك.` },
      anime:  { cls: 'end-anime',  icon: '🎬', title: 'صفقة أنمي!', sub: `"${S.name}" خلصت بالمركز #${finalRank}! الاستوديو يبي يحولها أنمي!` },
      quiet:  { cls: 'end-quiet',  icon: '📕', title: 'انتهت السلسلة بهدوء', sub: `"${S.name}" خلصت بالمركز #${finalRank}. القرّاء بيتذكرونها... أحياناً.` },
    };
    const T = TITLES[ending];
    const scr = $('#screen-end');
    scr.className = 'screen ' + T.cls;
    $('#end-icon').textContent = T.icon;
    $('#end-title').textContent = T.title;
    $('#end-sub').textContent = T.sub;
    $('#end-stats').innerHTML = `
      <div class="stat"><span>📖 أفضل فصل</span><b>الأسبوع ${best.week} — 🔥${best.hype}</b><small>${best.cards}</small></div>
      <div class="stat"><span>💥 أعلى كومبو</span><b>${S.topCombo ? S.topCombo.label : 'ولا كومبو 😅'}</b><small>${S.topCombo ? `+${S.topCombo.bonus} حماس (أسبوع ${S.topCombo.week})` : ''}</small></div>
      <div class="stat"><span>🏆 أفضل ترتيب</span><b>#${bestRank}</b><small>الترتيب الأخير #${finalRank}</small></div>
      <div class="stat"><span>👥 القرّاء</span><b>${fmt(S.readers)}</b><small>الترتيب أسبوعياً: ${S.ranks.join(' · ')}</small></div>`;
    $('#series-name').value = '';
    show('screen-end');
    if (ending === 'anime') confetti();
  }

  function confetti() {
    const fx = $('#end-fx');
    fx.innerHTML = '';
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('i');
      p.textContent = pick(['🔥', '⭐', '💥', '🎉', '❗']);
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 1.5 + 's';
      p.style.animationDuration = 2 + Math.random() * 2 + 's';
      fx.appendChild(p);
    }
  }

  // ---------- ربط الأحداث ----------
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', () => { if (drag && drag.ghost) { drag.ghost.remove(); drag.el.classList.remove('dragging'); } drag = null; });
  $('#btn-new').addEventListener('click', newSeries);
  $('#series-name').addEventListener('keydown', e => { if (e.key === 'Enter') newSeries(); });
  $('#btn-again').addEventListener('click', renderStart);
  $('#btn-publish').addEventListener('click', () => publish(false));

  renderStart();
})();
