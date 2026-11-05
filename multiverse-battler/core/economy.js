/*
 * Progression economy: every tunable number for the new systems lives here
 * (currencies now; packs, rarities, levels, tower… are added by later phases).
 * Plus two small shared helpers used by all progression systems:
 *   AMB.Wallet  – currency balances, saved in the unified save
 *   AMB.Events  – game events ("matchEnd", "cardUpgraded"…) that missions,
 *                 album, stars, etc. listen to, so systems don't call each other directly.
 * Nothing here can be bought with real money.
 */
(function () {
  const AMB = (globalThis.AMB = globalThis.AMB || {});

  const ECONOMY = {
    currencies: {
      shards: { name: 'شظايا', icon: 'gem', start: 0, max: 999999 },        // earned in missions/levels, spent on packs
    },
  };

  // ---------------------------------------------------------------- wallet
  AMB.Save.register('wallet', {
    version: 1,
    defaults: () => {
      const b = {};
      for (const [id, c] of Object.entries(ECONOMY.currencies)) b[id] = c.start;
      return { balances: b, earned: {}, spent: {} };   // earned/spent totals feed stats and missions
    },
  });

  function Wallet(save, events) {
    const st = () => save.get('wallet');
    const known = (id) => { if (!ECONOMY.currencies[id]) throw new Error('عملة غير معروفة: ' + id); };
    const clampAdd = (id, v) => Math.min(ECONOMY.currencies[id].max, v);
    return {
      balance: (id) => { known(id); return st().balances[id] || 0; },
      canAfford: (cost) => Object.entries(cost || {}).every(([id, n]) => { known(id); return (st().balances[id] || 0) >= n; }),
      /** add currency; amount must be a positive integer. Returns the new balance. */
      add(id, n, why) {
        known(id); n = Math.floor(n);
        if (!(n > 0)) return this.balance(id);
        const r = save.update('wallet', (s) => { s.balances[id] = clampAdd(id, (s.balances[id] || 0) + n); s.earned[id] = (s.earned[id] || 0) + n; return s.balances[id]; });
        if (events) events.emit('currency', { id, n, why: why || '' });
        return r;
      },
      /** spend a cost like { shards: 100 }; all-or-nothing. Returns true when paid. */
      spend(cost, why) {
        if (!this.canAfford(cost)) return false;
        save.update('wallet', (s) => { for (const [id, n] of Object.entries(cost)) { s.balances[id] -= n; s.spent[id] = (s.spent[id] || 0) + n; } });
        if (events) events.emit('spend', { cost, why: why || '' });
        return true;
      },
    };
  }

  // ---------------------------------------------------------------- events
  function Events() {
    const map = {};
    return {
      on(name, fn) { (map[name] = map[name] || []).push(fn); return () => { map[name] = map[name].filter((f) => f !== fn); }; },
      emit(name, data) { (map[name] || []).slice().forEach((f) => { try { f(data); } catch (e) { if (globalThis.console) console.error('event ' + name, e); } }); },
    };
  }

  AMB.ECONOMY = ECONOMY;
  AMB.Wallet = Wallet;
  AMB.Events = Events;
})();
