// اختبارات منطق الكومبوهات + محاكاة توازن. شغّل: node test.js
const fs = require('fs'), vm = require('vm');
const ctx = { module: { exports: {} }, console, Math };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/data.js', 'utf8') + '\n;this.CARDS=CARDS;this.BORING_CARD=BORING_CARD;', ctx);
vm.runInContext(fs.readFileSync(__dirname + '/game.js', 'utf8'), ctx);
const G = ctx.module.exports, { CARDS, BORING_CARD } = ctx;
const C = (type, hype) => ({ type, hype, name: type });

let pass = 0, fail = 0;
function eq(name, got, want) {
  if (got === want) pass++; else { fail++; console.log('✗', name, 'got', got, 'want', want); }
}

// قاعدي بدون كومبو
let r = G.scoreChapter([C('secret',3), C('romance',2), C('tear',4), C('laugh',1)]);
eq('base only', r.total, 10); eq('no combos', r.combos.length, 0);
// تدريب ← معركة ×2 : (2+4)*2 = 12, + 3 + 1
r = G.scoreChapter([C('train',2), C('battle',4), C('secret',3), C('romance',1)]);
eq('train→battle', r.total, 16);
// معركة ← تدريب (عكس) لا شي
r = G.scoreChapter([C('battle',4), C('train',2), C('secret',3), C('romance',1)]);
eq('battle→train no combo', r.total, 10);
// شرير ← معركة ← كليف في 2,3,4 : (3+4+2)*3=27 + كليف بالنهاية 3 + افتتاح 1 = 31
r = G.scoreChapter([C('laugh',1), C('villain',3), C('battle',4), C('cliff',2)]);
eq('villain→battle→cliff + cliff end', r.total, 31);
eq('combo count', r.combos.length, 2);
// ضحكة ← دمعة ×2 : (2+3)*2=10 + 3+3
r = G.scoreChapter([C('laugh',2), C('tear',3), C('secret',3), C('romance',3)]);
eq('laugh→tear', r.total, 16);
// تكرار -2
r = G.scoreChapter([C('secret',3), C('secret',2), C('tear',4), C('laugh',1)]);
eq('repeat penalty', r.total, 8);
// تدريب←معركة + ثلاثية لا تتداخل: train,battle,? — train,villain,battle,cliff
r = G.scoreChapter([C('train',2), C('villain',3), C('battle',4), C('cliff',2)]);
eq('vbc after train', r.total, 2 + 27 + 3);
// كليف بالنهاية فقط
r = G.scoreChapter([C('secret',1), C('romance',1), C('tear',1), C('cliff',2)]);
eq('cliff ending', r.total, 8);
// ممل يعطي 0 وما يحسب تكرار
r = G.scoreChapter([BORING_CARD, BORING_CARD, BORING_CARD, BORING_CARD]);
eq('all boring', r.total, 0); eq('boring no dominant', r.dominant, null);
// المسيطر + الملل
const ch = [C('battle',5), C('secret',1), C('battle',4), C('tear',1)];
eq('dominant', G.dominantType(ch), 'battle');
r = G.scoreChapter(ch, ['battle', 'battle']);
eq('bored -30%', r.total, Math.round(11 * 0.7)); eq('bored flag', r.bored, true);
r = G.scoreChapter(ch, ['secret', 'battle']);
eq('not bored', r.bored, false);
// تكرار battle,battle متتالي + train قبله
r = G.scoreChapter([C('train',1), C('battle',3), C('battle',3), C('cliff',1)]);
eq('train→battle + repeat + cliff end', r.total, 8 + 4 - 2 + 3);
// النهايات
eq('cancel', G.checkEnding([5, 8, 9, 11], 4), 'cancel');
eq('continue', G.checkEnding([8, 9, 7], 3), null);
eq('anime', G.checkEnding(Array(10).fill(3), 10), 'anime');
eq('quiet', G.checkEnding([...Array(9).fill(5), 4], 10), 'quiet');
eq('comment lvl', G.commentLevel(5) + G.commentLevel(15) + G.commentLevel(30), 'weakmidfire');
console.log(`tests: ${pass} passed, ${fail} failed`);

// ---- محاكاة توازن ----
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function perms(arr, k) { if (!k) return [[]]; const out = []; arr.forEach((x, i) => perms(arr.filter((_, j) => j !== i), k - 1).forEach(p => out.push([x, ...p]))); return out; }
function draft(strategy) {
  // يحاكي اختيار 5 من خيارات 3 (عشوائي أو طمّاع بالحماس)
  let pool = shuffle(CARDS).slice(0, 7), hand = [];
  for (let p = 0; p < 5; p++) {
    pool = shuffle(pool); const opts = pool.splice(0, 3);
    opts.sort((a, b) => b.hype - a.hype);
    const pickI = strategy === 'random' ? Math.floor(Math.random() * opts.length) : 0;
    hand.push(opts.splice(pickI, 1)[0]); pool.push(...opts);
  }
  return hand;
}
function play(strategy) {
  const cfg = G.CONFIG; let readers = cfg.startReaders; const fakes = G.makeFakeSeries(); const doms = [], ranks = []; let ending = null, w;
  for (w = 1; w <= cfg.totalWeeks && !ending; w++) {
    const hand = draft(strategy);
    let best;
    if (strategy === 'random') best = G.scoreChapter(shuffle(hand).slice(0, 4), doms);
    else for (const p of perms(hand, 4)) { const s = G.scoreChapter(p, doms); if (!best || s.total > best.total) best = s; }
    doms.push(best.dominant);
    readers *= 1 + G.growthRate(best.total);
    const [a, b] = G.rivalRange(w); const rv = a + Math.floor(Math.random() * (b - a + 1));
    readers *= 1 + (best.total > rv ? cfg.rivalWinBonus : cfg.rivalLosePenalty);
    fakes.forEach(f => G.advanceFake(f));
    const me = { readers, hype: best.total };
    const table = [...fakes, me].sort((x, y) => G.rankScore(y) - G.rankScore(x));
    ranks.push(table.indexOf(me) + 1);
    ending = G.checkEnding(ranks, w);
  }
  return ending;
}
for (const s of ['random', 'greedy']) {
  const n = 2000, tally = { cancel: 0, quiet: 0, anime: 0 };
  for (let i = 0; i < n; i++) tally[play(s)]++;
  console.log(s.padEnd(7), Object.entries(tally).map(([k, v]) => `${k} ${(100 * v / n).toFixed(0)}%`).join('  '));
}
process.exit(fail ? 1 : 0);
