#!/usr/bin/env node
/* Rule tests for the core (no browser needed):  node tools/test.js */
const path = require('path');
['config', 'data', 'util', 'synergy', 'combat', 'match', 'ai', 'telemetry'].forEach((f) => require(path.join(__dirname, '..', 'core', f + '.js')));
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
