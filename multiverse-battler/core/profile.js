/*
 * Player profile bootstrap: one save, one event bus, one wallet shared by
 * every progression system. In the browser it runs once on load and exposes
 * AMB.save / AMB.events / AMB.wallet. Tests call AMB.Profile.boot(memoryStorage).
 */
(function () {
  const AMB = globalThis.AMB;
  function boot(storage, nowFn, rng) {
    const save = AMB.Save.create(storage, nowFn);
    const events = AMB.Events();
    const wallet = AMB.Wallet(save, events);
    const collection = AMB.Collection(save, events);
    const packs = AMB.Packs(save, wallet, collection, events, rng);
    return { save, events, wallet, collection, packs };
  }
  AMB.Profile = { boot };
  if (typeof document !== 'undefined' && !AMB.save) {
    const p = boot();
    AMB.save = p.save; AMB.events = p.events; AMB.wallet = p.wallet; AMB.collection = p.collection; AMB.packs = p.packs;
  }
})();
