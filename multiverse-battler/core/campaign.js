/*
 * Campaign progress: which fights are unlocked / cleared, building a fight's match,
 * and paying rewards (first win: shards + battle-pass XP; boss: more; whole level: a free pack;
 * replays: a little). Level data lives in core/levels.js.
 */
(function () {
  const AMB = globalThis.AMB;
  const LV = () => AMB.LEVELS;

  AMB.Save.register('campaign', {
    version: 1,
    // cleared[fightId] = true; levelsDone[levelId] = true; stats per fight: { attempts, wins, best:{ lifeLeft, roundsLost } }
    defaults: () => ({ cleared: {}, levelsDone: {}, stats: {} }),
  });

  function Campaign(save, deps) {
    deps = deps || {};
    const st = () => save.get('campaign');
    const levels = () => LV().LEVELS;

    function find(fightId) {
      for (let li = 0; li < levels().length; li++) {
        const l = levels()[li], fi = l.fights.findIndex((f) => f.id === fightId);
        if (fi >= 0) return { level: l, li, fight: l.fights[fi], fi };
      }
      return null;
    }

    const api = {
      levels,
      find,
      isCleared: (fightId) => !!st().cleared[fightId],
      levelDone: (levelId) => !!st().levelsDone[levelId],
      progress(levelId) { const l = levels().find((x) => x.id === levelId); return { cleared: l.fights.filter((f) => api.isCleared(f.id)).length, total: l.fights.length }; },
      levelUnlocked(li) { return li === 0 || api.levelDone(levels()[li - 1].id); },
      isUnlocked(fightId) {
        const f = find(fightId); if (!f) return false;
        if (!api.levelUnlocked(f.li)) return false;
        return f.fi === 0 || api.isCleared(f.level.fights[f.fi - 1].id);
      },
      /** first unlocked fight not yet cleared (or null when everything is done) */
      next() { for (const l of levels()) for (const f of l.fights) if (api.isUnlocked(f.id) && !api.isCleared(f.id)) return f.id; return null; },
      stats: (fightId) => st().stats[fightId] || { attempts: 0, wins: 0, best: null },
      rewardsFor(fightId) {
        const f = find(fightId), R = LV().CAMPAIGN.rewards;
        if (api.isCleared(fightId)) return { replay: true, shards: R.replay.shards, passXp: 0 };
        const base = f.fight.boss ? R.boss : R.fight;
        const lastOfLevel = f.level.fights.filter((x) => !api.isCleared(x.id)).length === 1;
        return { replay: false, shards: base.shards, passXp: base.passXp, pack: lastOfLevel ? R.level.pack : null };
      },

      /** Options for new AMB.Match(...) for this fight. */
      matchOptions(fightId, heroId, seed) {
        const f = find(fightId); if (!f) throw new Error('قتال غير معروف: ' + fightId);
        const C = deps.collection, fight = f.fight, boss = fight.boss ? LV().BOSS[f.level.world] : null;
        const enemyPower = {};
        fight.units.forEach(([id]) => (enemyPower[id] = fight.power));
        enemyPower[f.level.hero] = fight.power;
        return {
          mode: 'campaign', seed, progression: true,
          rules: Object.assign({}, LV().CAMPAIGN.rules, { start: f.level.start }),
          players: [
            { heroId, name: 'أنت', cardPower: C ? C.powerMap() : null, allowedUnits: C ? C.ownedUnits() : null },
            { heroId: f.level.hero, name: fight.name, isAI: true, cardPower: enemyPower,
              lineup: { units: fight.units, summon: boss ? 'b1' : null, blessings: boss ? boss.blessings : null, abilities: boss ? boss.abilities : [] } },
          ],
        };
      },

      /** Record a finished fight (match.summary(0) + life left). Returns what was paid. */
      recordResult(fightId, res) {
        const f = find(fightId); if (!f) return null;
        const won = !!res.won;
        const pay = won ? api.rewardsFor(fightId) : null;
        const out = { fightId, won, boss: !!f.fight.boss, first: !!(pay && !pay.replay), shards: 0, passXp: 0, pack: null, levelComplete: false };
        save.update('campaign', (s) => {
          const x = (s.stats[fightId] = s.stats[fightId] || { attempts: 0, wins: 0, best: null });
          x.attempts++;
          if (!won) return;
          x.wins++;
          const cur = { lifeLeft: res.lifeLeft || 0, roundsLost: res.roundsLost || 0 };
          if (!x.best || cur.lifeLeft > x.best.lifeLeft) x.best = cur;
          s.cleared[fightId] = true;
          if (f.level.fights.every((ff) => s.cleared[ff.id]) && !s.levelsDone[f.level.id]) { s.levelsDone[f.level.id] = true; out.levelComplete = true; }
        });
        if (pay) {
          if (pay.shards && deps.wallet) { deps.wallet.add('shards', pay.shards, 'campaign'); out.shards = pay.shards; }
          if (pay.passXp && deps.addPassXp) { deps.addPassXp(pay.passXp); out.passXp = pay.passXp; }
          if (out.levelComplete && pay.pack && deps.packs) out.pack = deps.packs.open(pay.pack, { free: true });
        }
        if (deps.events) deps.events.emit('fightEnd', Object.assign({}, out, { summary: res }));
        return out;
      },
    };
    return api;
  }

  AMB.Campaign = Campaign;
})();
