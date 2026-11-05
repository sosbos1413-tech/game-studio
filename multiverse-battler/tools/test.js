#!/usr/bin/env node
/* Rule tests for the core (no browser needed):  node tools/test.js */
const path = require('path');
['config', 'data', 'util', 'synergy', 'combat', 'match', 'ai', 'telemetry', 'pass'].forEach((f) => require(path.join(__dirname, '..', 'core', f + '.js')));
const AMB = globalThis.AMB;
let pass = 0, fail = 0;
function t(name, fn) {
  try { fn(); pass++; console.log('  ✓ ' + name); } catch (e) { fail++; console.log('  ✗ ' + name + '\n    ' + e.message); }
}
function eq(a, b, msg) { if (a !== b) throw new Error((msg || '') + ` expected ${b}, got ${a}`); }
function ok(v, msg) { if (!v) throw new Error(msg || 'assertion failed'); }

const side = (units, extra) => Object.assign({ heroId: 'orath', life: 100, maxLife: 100, summoned: false, heroSlot: 'b1', units, spells: [], abilities: [] }, extra || {});
const U = (defId, slot, star) => ({ uid: defId + slot, defId, star: star || 1, items: [], slot });

console.log('combat');
t('hero is untargetable while a front-row ally lives', () => {
  const c = new AMB.Combat([side([U('moss_warden', 'f1')]), side([U('grid_hound', 'f1')])], { seed: 1, round: 1 });
  const hero0 = c.sides[0].hero;
  ok(!c.targetable(hero0), 'protected hero should not be targetable');
  // assassin must never pick the protected hero
  for (let i = 0; i < 40; i++) c.step();
  const hound = c.fighters.find((f) => f.defId === 'grid_hound');
  ok(!hound.target || !hound.target.isHero, 'assassin targeted protected hero');
});
t('hero becomes exposed when the front line falls', () => {
  const c = new AMB.Combat([side([U('moss_warden', 'f1'), U('pixel_sniper', 'b1')]), side([U('chrome_ronin', 'f1', 3)])], { seed: 2, round: 1 });
  const warden = c.fighters.find((f) => f.defId === 'moss_warden');
  c.damage(null, warden, 1e6);
  ok(c.sides[0].exposed, 'side should be exposed');
  ok(c.targetable(c.sides[0].hero), 'exposed hero should be targetable');
});
t('no front row => exposed from the start', () => {
  const c = new AMB.Combat([side([U('pixel_sniper', 'b1')]), side([U('grid_hound', 'f1')])], { seed: 3, round: 1 });
  ok(c.sides[0].exposed);
});
t('summoned hero in the front row is always targetable', () => {
  const c = new AMB.Combat([side([U('moss_warden', 'f2')], { summoned: true, heroSlot: 'f1' }), side([U('grid_hound', 'f1')])], { seed: 4, round: 1 });
  ok(c.targetable(c.sides[0].hero));
});
t('command-post damage is capped per combat', () => {
  const c = new AMB.Combat([side([]), side([U('chrome_ronin', 'f1', 3), U('wild_stalker', 'f2', 3)])], { seed: 5, round: 1 });
  const r = c.runToEnd();
  const cap = AMB.CONFIG.combat.postDamageCapBase + AMB.CONFIG.combat.postDamageCapPerRound * 1;
  ok(100 - r.sides[0].heroLife <= cap + 1e-6, `lost ${100 - r.sides[0].heroLife} > cap ${cap}`);
  eq(r.winner, 1);
});
t('summoned hero retreats after the knockout threshold instead of dying', () => {
  const c = new AMB.Combat([side([], { summoned: true, heroSlot: 'f1', life: 80 }), side([U('chrome_ronin', 'f1', 3), U('wild_stalker', 'f2', 3), U('caldera_seer', 'b1', 3)])], { seed: 6, round: 3 });
  const r = c.runToEnd();
  ok(!r.sides[0].heroKilled, 'hero should not die above knockout');
  ok(r.sides[0].heroLife >= 80 - AMB.CONFIG.combat.summonKnockout - 1e-6);
});
t('summoned hero with low life can die => instant match loss', () => {
  const m = new AMB.Match({ seed: 7, players: [{ heroId: 'kagira' }, { heroId: 'orath' }] });
  m.startRound();
  m.players[0].life = 5;
  m.toggleSummon(0, 'f1');
  m.players[1].board = { f1: { uid: 'x1', defId: 'chrome_ronin', star: 3, items: [] }, f2: { uid: 'x2', defId: 'wild_stalker', star: 3, items: [] } };
  const res = m.createCombat(false).runToEnd();
  ok(res.sides[0].heroKilled, 'hero should be killed');
  m.resolveCombat(res);
  ok(m.isOver); eq(m.winner, 1);
});
t('combat is deterministic for a seed', () => {
  const mk = () => new AMB.Combat([side([U('ash_ronin', 'f1'), U('pyre_archer', 'b1')]), side([U('thorn_fox', 'f1'), U('willow_eye', 'b2', 2)])], { seed: 99, round: 2, record: false }).runToEnd();
  const a = mk(), b = mk();
  eq(JSON.stringify(a), JSON.stringify(b));
});

t('healing cannot raise a hero above the life it started the combat with', () => {
  const c = new AMB.Combat([side([U('tide_priest', 'b1')], { summoned: true, heroSlot: 'f1', life: 90 }), side([])], { seed: 1, round: 3 });
  const h = c.sides[0].hero;
  c.heal(h, 5000);
  eq(h.hp, 900, 'heal at full start life');
  c.damage(null, h, 300);
  c.heal(h, 5000);
  eq(h.hp, 900, 'heal back to start life only');
  ok(h.hp < h.maxHp, 'must stay under max life');
});
t('across 40 full AI matches a hero never ends a combat with more life than it began with', () => {
  for (let sd = 1; sd <= 40; sd++) {
    const m = new AMB.Match({ seed: sd, players: [{ heroId: ['merin', 'orath', 'zerokai', 'kagira'][sd % 4], isAI: true, aiStyle: 'mixed' }, { heroId: 'merin', isAI: true, aiStyle: 'mono' }] });
    while (!m.isOver) {
      m.startRound(); AMB.AI.prep(m, 0); AMB.AI.prep(m, 1);
      const before = m.players.map((p) => p.life);
      const res = m.createCombat(false).runToEnd();
      res.sides.forEach((sd2, i) => ok(sd2.heroLife <= before[i] + 1e-6, `match ${sd} round ${m.round}: life ${before[i]} -> ${sd2.heroLife}`));
      m.resolveCombat(res);
    }
  }
});

t('if both heroes fall in the same round, the round winner takes the match', () => {
  const m = new AMB.Match({ seed: 21, players: [{ heroId: 'kagira' }, { heroId: 'orath' }] });
  m.startRound(); m.round = AMB.CONFIG.match.collapseStartRound + 4;   // collapse hits both for a lot
  m.players[0].life = 6; m.players[1].life = 6;
  const res = { winner: 0, duration: 10, sides: [{ heroLife: 6, heroKilled: false, survivors: [], abilitiesFired: [], exposed: false }, { heroLife: 6, heroKilled: false, survivors: [], abilitiesFired: [], exposed: false }], unitDamage: {} };
  m.resolveCombat(res);
  ok(m.isOver); eq(m.winner, 0, 'round winner should win');
});

console.log('stages & rewards');
const sim1 = (seed) => new AMB.Match({ seed, players: [{ heroId: 'kagira' }, { heroId: 'merin' }] });
t('7 rounds in 4 stages: rounds map to the right stage', () => {
  const m = sim1(31);
  eq(AMB.CONFIG.match.maxRounds, 7);
  eq([1, 2, 3, 4, 5, 6, 7].map((r) => m.stageIndex(r)).join(''), '0011223');
  ok(m.isFinale(7) && !m.isFinale(6));
});
t('reward drafts appear only after rounds 2, 4 and 6, with 3 distinct options incl. a unit', () => {
  const m = sim1(32); const seen = [];
  while (!m.isOver) {
    m.startRound(); AMB.AI.prep(m, 0); AMB.AI.prep(m, 1);
    m.resolveCombat(m.createCombat(false).runToEnd());
    if (m.rewardPending) { seen.push(m.round); m.players.forEach((p) => { const o = p.rewardOffer.options; ok(o.length >= 3 && o.length <= 4); eq(new Set(o).size, o.length, 'options must be distinct'); ok(o.includes('unit')); }); AMB.AI.claimRewards(m); }
  }
  ok(seen.every((r) => [2, 4, 6].includes(r)), 'drafts at ' + seen);
  ok(m.round <= 7);
});
t('claiming: gold, xp, heal (capped), unit (bench + shared pool) and blessing', () => {
  const m = sim1(33); m.startRound();
  const p = m.players[0];
  const give = (id) => { p.rewardOffer = { stage: 0, options: [id], claimed: false }; return m.claimReward(0, 0); };
  const g0 = p.gold; ok(give('gold').ok); eq(p.gold, g0 + AMB.DATA.REWARDS.gold.n[0]);
  const x0 = p.xp; give('xp'); ok(p.xp > x0 || p.level > 3);
  p.life = 95; give('heal'); eq(p.life, 100, 'heal is capped at max life');
  const pool0 = Object.values(m.pool).reduce((a, b) => a + b, 0); const n0 = m.allUnits(p).length; give('unit');
  eq(m.allUnits(p).length, n0 + 1); eq(Object.values(m.pool).reduce((a, b) => a + b, 0), pool0 - 1);
  give('bless_atk'); ok(p.blessings.atkPct > 0);
  ok(!m.claimReward(0, 0).ok, 'cannot claim twice');
});
t('a blessing really makes the team stronger in combat', () => {
  const mk = (bl) => new AMB.Combat([side([U('ash_ronin', 'f1')], { blessings: bl }), side([U('thorn_fox', 'f1')])], { seed: 4, round: 3, record: false });
  const a = mk({ atkPct: 0, hpPct: 0, asPct: 0 }), b = mk({ atkPct: 0.5, hpPct: 0.5, asPct: 0.5 });
  const unit = (c) => c.fighters.find((f) => f.defId === 'ash_ronin');
  ok(unit(b).atk > unit(a).atk * 1.4 && unit(b).maxHp > unit(a).maxHp * 1.4 && unit(b).as > unit(a).as * 1.4);
});
t('the finale multiplies the life lost by the loser of the round', () => {
  const run = (round) => {
    const m = sim1(34); m.startRound(); m.round = round; m.players.forEach((p) => (p.life = 100));
    const loser = { heroLife: 100, heroKilled: false, survivors: [{ defId: 'ash_ronin', star: 1 }], abilitiesFired: [], exposed: false };
    const rep = m.resolveCombat({ winner: 1, duration: 10, sides: [loser, { heroLife: 100, heroKilled: false, survivors: [{ defId: 'ash_ronin', star: 1 }], abilitiesFired: [], exposed: false }], unitDamage: {} });
    return rep.players[0].backlash;
  };
  const mult = AMB.CONFIG.match.finaleLossMult;
  AMB.CONFIG.match.finaleLossMult = 1; const plain = run(7);
  AMB.CONFIG.match.finaleLossMult = mult; const finale = run(7);
  ok(finale > plain, `finale backlash ${finale} should exceed ${plain}`);
  ok(Math.abs(finale - Math.round(plain * mult)) <= 1, 'should be about x' + mult);
  const r6 = run(6); ok(r6 <= plain, 'round 6 is not multiplied');
});
t('after round 7 the higher hero life wins (tie -> rounds won)', () => {
  const m = sim1(35); m.startRound(); m.round = 7; m.players[0].life = 60; m.players[1].life = 40;
  const sd = { heroLife: 0, heroKilled: false, survivors: [], abilitiesFired: [], exposed: false };
  m.players[0].life = 60; m.players[1].life = 40;
  m.resolveCombat({ winner: null, duration: 30, sides: [Object.assign({}, sd, { heroLife: 60 }), Object.assign({}, sd, { heroLife: 40 })], unitDamage: {} });
  ok(m.isOver); eq(m.winner, 0);
});

t('autoArrange: guardians/fighters in front, ranged behind, level cap respected, nothing lost', () => {
  const m = new AMB.Match({ seed: 41, players: [{ heroId: 'kagira' }, { heroId: 'orath' }] }); m.startRound();
  const p = m.players[0]; p.level = 5;
  const defs = ['moss_warden', 'ash_ronin', 'pixel_sniper', 'mist_witch', 'wave_caller', 'grid_hound', 'tide_priest'];
  defs.forEach((d, i) => (p.bench[i % 6] = p.bench[i % 6] || { uid: 'z' + i, defId: d, star: 1 + (i % 2), items: [] }));
  const before = m.allUnits(p).length;
  m.autoArrange(0);
  eq(Object.keys(p.board).length, Math.min(5, before));
  eq(m.allUnits(p).length, before, 'no unit may disappear');
  Object.entries(p.board).forEach(([slot, u]) => { const side = AMB.DATA.ROLES[AMB.DATA.UNITS[u.defId].role].side; if (side === 'front') ok(slot[0] === 'f', u.defId + ' should be in front'); if (side === 'back') ok(slot[0] === 'b', u.defId + ' should be behind'); });
  ok(Object.keys(p.board).some((s) => s[0] === 'f'), 'a front line must exist');
});
t('autoArrange never uses the slot of a summoned hero', () => {
  const m = new AMB.Match({ seed: 42, players: [{ heroId: 'kagira' }, { heroId: 'orath' }] }); m.startRound();
  const p = m.players[0]; p.level = 4; p.summoned = true; p.heroSlot = 'f1';
  ['moss_warden', 'ash_ronin', 'forge_bulwark', 'pixel_sniper'].forEach((d, i) => (p.bench[i] = { uid: 'q' + i, defId: d, star: 1, items: [] }));
  m.autoArrange(0); ok(!p.board.f1, 'f1 belongs to the hero');
});
t('every role has a placement hint and a kind (shown on cards)', () => {
  Object.values(AMB.DATA.ROLES).forEach((r) => { ok(r.place && ['front', 'back', 'any'].includes(r.side) && ['def', 'off'].includes(r.kind), r.id); });
});

console.log('battle pass');
const memStore = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m }; };
const T0 = new Date(2026, 10, 5, 12).getTime();
const mkPass = (st, t) => AMB.Pass.create(st || memStore(), () => (t == null ? T0 : t));
const sm = (o) => Object.assign({ mode: 'normal', won: false, roundsPlayed: 7, roundsWon: 0, finaleWon: false, buys: 0, rerolls: 0, merges: 0, summoned: false, stageRewards: 0, damage: 0, worldsUsed: 1 }, o || {});
t('pass: both tracks have 30 valid rewards with no duplicate cosmetic across tracks', () => {
  const P = AMB.Pass, seen = new Set();
  eq(Object.keys(P.FREE).length, 30); eq(Object.keys(P.PREMIUM).length, 30);
  [['free', P.FREE], ['premium', P.PREMIUM]].forEach(([tr, tbl]) => Object.values(tbl).forEach((r) => {
    if (r.type === 'perk') return;
    const k = r.type + ':' + r.id; ok(!seen.has(k), 'duplicate ' + k); seen.add(k);
    if (r.type === 'avatar') ok(AMB.DATA.UNITS[r.id] || AMB.DATA.HEROES[r.id], 'unknown avatar ' + r.id); else ok(P.COSMETICS[r.type][r.id], 'unknown ' + r.type + ' ' + r.id);
  }));
});
t('pass: xp -> level (100 per level, max 30)', () => {
  const p = mkPass(); eq(p.level(), 1); p.addXp(99); eq(p.level(), 1); p.addXp(1); eq(p.level(), 2); p.addXp(100000); eq(p.level(), 30); ok(p.maxed());
});
t('pass: match xp = played + rounds + win (+ first win of the day once), scaled by mode, friendly = 0', () => {
  const p = mkPass();
  const a = p.recordMatch(sm({ won: true, roundsWon: 4 })); eq(a.xp, 30 + 24 + 40 + 40, 'first win of the day included');
  const b = p.recordMatch(sm({ won: true, roundsWon: 4 })); eq(b.xp, 30 + 24 + 40, 'first win bonus only once per day');
  const hard = mkPass().recordMatch(sm({ mode: 'hard', roundsWon: 2 })); eq(hard.xp, Math.round((30 + 12) * 1.25));
  const easy = mkPass().recordMatch(sm({ mode: 'easy', roundsWon: 2 })); eq(easy.xp, Math.round((30 + 12) * 0.6));
  const fr = mkPass(); const f = fr.recordMatch(sm({ mode: 'friendly', won: true, roundsWon: 5 })); eq(f.xp, 0); eq(fr.state().xp, 0);
  ok(mkPass().recordMatch(sm({ won: true, finaleWon: true, roundsWon: 1 })).xp > mkPass().recordMatch(sm({ won: true, roundsWon: 1 })).xp, 'finale bonus');
});
t('pass: daily missions are 3, stable within a day, change on another day; progress and one-time claim', () => {
  const st = memStore(); let p = mkPass(st);
  const d = p.dailyMissions(); eq(d.length, 3); eq(new Set(d.map((m) => m.id)).size, 3);
  eq(mkPass(st).dailyMissions().map((m) => m.id).join(), d.map((m) => m.id).join(), 'same day -> same missions');
  const next = mkPass(memStore(), T0 + 3 * 86400000).dailyMissions().map((m) => m.id).join();
  const other = [1, 2, 3, 4, 5, 6].some((k) => mkPass(memStore(), T0 + k * 86400000).dailyMissions().map((m) => m.id).join() !== d.map((m) => m.id).join()); ok(other, 'missions rotate across days');
  eq(p.weeklyMissions().length, 3);
  // finish everything possible in one huge match, then claim
  p.recordMatch(sm({ won: true, roundsWon: 7, finaleWon: true, buys: 40, rerolls: 20, merges: 10, summoned: true, stageRewards: 3, damage: 20000, worldsUsed: 4 }));
  const done = p.dailyMissions().concat(p.weeklyMissions()).filter((m) => m.done); ok(done.length >= 3, 'a huge match completes several missions');
  const xp0 = p.state().xp; const c = p.claimMission(done[0].id); ok(c && c.xp > 0); eq(p.state().xp, xp0 + c.xp); eq(p.claimMission(done[0].id), null, 'cannot claim twice');
});
t('pass: missions reset on a new day (claims too)', () => {
  const st = memStore(); const p = mkPass(st); p.recordMatch(sm({ won: true, roundsWon: 7, buys: 40, merges: 5 }));
  const nd = mkPass(st, T0 + 86400000); ok(nd.dailyMissions().every((m) => m.progress === 0), 'daily progress reset'); ok(nd.state().xp > 0, 'xp is kept');
});
t('pass: claiming needs the level, premium needs premium, no double claim, claimAll', () => {
  const p = mkPass();
  ok(!p.canClaim(2, 'free'), 'level 2 not reached'); ok(p.canClaim(1, 'free')); ok(p.claim(1, 'free')); ok(!p.claim(1, 'free'), 'no double claim');
  ok(!p.canClaim(1, 'premium'), 'premium locked'); p.addXp(500); ok(p.level() === 6);
  const got = p.claimAll(); eq(got.filter((g) => g.track === 'premium').length, 0, 'premium stays locked'); eq(got.length, 5, 'free levels 2-6');
  p.setPremium(true); ok(p.claimAll().length === 6, 'premium levels 1-6 after unlocking');
});
t('pass: equip only what you own; perks add prep time', () => {
  const p = mkPass(); p.addXp(1400);
  ok(!p.equip('frame', 'gold'), 'not owned yet'); eq(p.prepBonus(), 0);
  p.claimAll(); ok(p.equip('frame', 'bronze')); ok(p.equip('avatar', 'ash_ronin')); ok(!p.equip('avatar', 'kagira'), 'premium avatar locked');
  eq(p.prepBonus(), 10, 'perk levels 5 and 15 give +5s each'); ok(p.owned('title').includes('t_recruit'));
});
t('pass: season end freezes xp but rewards you already earned stay claimable', () => {
  const st = memStore(); const p = mkPass(st); p.addXp(300);
  const late = mkPass(st, T0 + 50 * 86400000); ok(late.ended()); eq(late.addXp(500), 0); eq(late.state().xp, 300); ok(late.claim(3, 'free'));
  eq(late.recordMatch(sm({ won: true, roundsWon: 7 })).xp, 0);
});
t('pass: progress persists through storage; corrupt data is ignored', () => {
  const st = memStore(); mkPass(st).addXp(250); eq(mkPass(st).level(), 3);
  const bad = memStore(); bad.setItem(AMB.Pass.KEY, '{not json'); eq(mkPass(bad).level(), 1);
});
t('match.summary() reports the facts the pass needs', () => {
  const m = new AMB.Match({ seed: 51, mode: 'ai', players: [{ heroId: 'kagira' }, { heroId: 'orath', isAI: true, difficulty: 'hard' }] });
  while (!m.isOver) { m.startRound(); AMB.AI.prep(m, 0); AMB.AI.prep(m, 1); m.resolveCombat(m.createCombat(false).runToEnd()); }
  const s0 = m.summary(0); eq(s0.mode, 'hard'); eq(s0.roundsPlayed, m.round); eq(s0.roundsWon, m.players[0].stats.wins); ok(s0.buys > 0); ok(s0.worldsUsed >= 1); eq(typeof s0.won, 'boolean');
});

console.log('economy');
t('3 copies merge into a 2-star, keeping the board position', () => {
  const m = new AMB.Match({ seed: 11, players: [{ heroId: 'kagira' }, { heroId: 'orath' }] });
  m.startRound();
  const p = m.players[0];
  p.gold = 50;
  for (let i = 0; i < 3; i++) {
    p.shop[0] = 'ash_ronin';
    const r = m.buy(0, 0);
    ok(r.ok, r.reason);
    if (i === 0) m.move(0, r.unit.uid, { zone: 'board', slot: 'f2' });
  }
  const all = m.allUnits(p).filter((u) => u.defId === 'ash_ronin');
  eq(all.length, 1); eq(all[0].star, 2);
  eq(p.board.f2 && p.board.f2.defId, 'ash_ronin');
  eq(m.pool.ash_ronin, AMB.CONFIG.economy.poolSize[1] - 3);
});
t('selling returns gold and copies to the shared pool', () => {
  const m = new AMB.Match({ seed: 12, players: [{ heroId: 'kagira' }, { heroId: 'orath' }] });
  m.startRound();
  const p = m.players[0]; p.gold = 20;
  p.shop[0] = 'caldera_seer';
  const r = m.buy(0, 0);
  const before = m.pool.caldera_seer;
  m.sell(0, r.unit.uid);
  eq(m.pool.caldera_seer, before + 1); eq(p.gold, 20);
});
t('board capacity equals level', () => {
  const m = new AMB.Match({ seed: 13, players: [{ heroId: 'kagira' }, { heroId: 'orath' }] });
  m.startRound();
  const p = m.players[0]; p.gold = 50;
  const ids = ['ash_ronin', 'forge_bulwark', 'grid_hound', 'pixel_sniper'];
  const uids = ids.map((id) => { p.shop[0] = id; return m.buy(0, 0).unit.uid; });
  ['f0', 'f1', 'f2'].forEach((s, i) => ok(m.move(0, uids[i], { zone: 'board', slot: s }).ok));
  ok(!m.move(0, uids[3], { zone: 'board', slot: 'f3' }).ok, 'should exceed level cap');
});
t('interest and streak income', () => {
  const m = new AMB.Match({ seed: 14, players: [{ heroId: 'kagira' }, { heroId: 'orath' }] });
  m.startRound();
  const p = m.players[0];
  p.gold = 25; p.winStreak = 2;
  m.startRound();
  const E = AMB.CONFIG.economy;
  eq(p.lastIncome.total, E.baseIncome + 2 + 1 + E.winBonus);
});
t('abilities reserve essence and refund when not triggered', () => {
  const m = new AMB.Match({ seed: 15, players: [{ heroId: 'merin' }, { heroId: 'orath' }] });
  m.startRound();
  const p = m.players[0]; p.essence = 4;
  ok(m.setAbility(0, 'moon_spring', 'firstDeath').ok);
  ok(!m.setAbility(0, 'tidal_ward', 'start').ok, 'should not over-reserve');
  m.players[1].board = {};
  p.board = { f1: { uid: 'a', defId: 'coral_sentinel', star: 3, items: [] } };
  const res = m.createCombat(false).runToEnd();
  m.resolveCombat(res);
  eq(p.essence, 4, 'unfired ability must not cost essence');
});
t('a full AI vs AI match always terminates within the round cap', () => {
  for (let s = 1; s <= 20; s++) {
    const m = new AMB.Match({ seed: s, players: [{ heroId: 'zerokai', isAI: true }, { heroId: 'merin', isAI: true, aiStyle: 'mono' }] });
    while (!m.isOver) { m.startRound(); AMB.AI.prep(m, 0); AMB.AI.prep(m, 1); m.resolveCombat(m.createCombat(false).runToEnd()); }
    ok(m.round <= AMB.CONFIG.match.maxRounds);
  }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
