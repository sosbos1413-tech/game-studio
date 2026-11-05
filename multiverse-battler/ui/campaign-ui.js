/*
 * "الحملة" screen: 4 levels (one per world), each a path of 4 fights + a boss.
 * A fight preview shows the enemy line-up, the boss special and the rewards; then a short
 * best-of-3 match starts (ui.js startMatch with S.mode = 'campaign'). Logic: core/campaign.js, data: core/levels.js.
 */
(function () {
  const AMB = globalThis.AMB;
  const $ = (id) => document.getElementById(id);
  const CAM = AMB.campaign, LV = AMB.LEVELS, C = AMB.collection;
  const { icon } = AMB.art;
  const UI = () => globalThis.AMB_UI;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let hero = null;   // hero used for campaign fights (remembered while the page is open)

  const W = (id) => AMB.DATA.WORLDS[id];
  const pickHero = () => {
    const owned = C.ownedHeroes();
    if (hero && owned.includes(hero)) return hero;
    return (hero = C.starterHero() && owned.includes(C.starterHero()) ? C.starterHero() : owned[0] || null);
  };

  function node(l, f, i) {
    const cleared = CAM.isCleared(f.id), open = CAM.isUnlocked(f.id), next = CAM.next() === f.id;
    const cls = ['cnode', f.boss ? 'boss' : '', cleared ? 'cleared' : '', open ? 'open' : 'locked', next ? 'next' : ''].join(' ');
    const inner = f.boss ? UI().portrait(AMB.DATA.HEROES[l.hero], { bare: true, k: 'cb' + l.id }) : `<b>${i + 1}</b>`;
    return `<button class="${cls}" ${open ? `data-act="camFight" data-id="${f.id}"` : 'disabled'} title="${esc(f.name)}">${inner}${cleared ? '<i class="ck">✓</i>' : open ? '' : '<i class="lk">🔒</i>'}<span class="cn-name">${esc(f.name)}</span></button>`;
  }

  function render() {
    const root = $('campaign'); if (!root) return;
    const R = LV.CAMPAIGN.rewards;
    if (C.needsStarter()) { root.innerHTML = '<div class="cam-note">اختر بطلك الأول من «العب» قبل ما تبدأ الحملة.</div>'; return; }
    root.innerHTML = `<div class="cam-note">كل قتال <b>أفضل من 3 جولات</b> ضد تشكيلة ثابتة. مستويات بطاقاتك وندرتها <b>تُحتسب هنا</b>، والمتجر يعرض الوحدات اللي تملكها فقط.
        الفوز الأول: ${icon('gem')} ${R.fight.shards} + ${R.fight.passXp} خبرة ممر · الزعيم: ${icon('gem')} ${R.boss.shards} + ${R.boss.passXp} خبرة · إنهاء المستوى: باكج مجاني · الإعادة: ${icon('gem')} ${R.replay.shards}</div>
      <div class="cam-levels">${LV.LEVELS.map((l, li) => {
        const pr = CAM.progress(l.id), unlocked = CAM.levelUnlocked(li);
        return `<section class="cam-level ${unlocked ? '' : 'locked'} ${CAM.levelDone(l.id) ? 'done' : ''}" style="--wc:${W(l.world).color}">
          <header><span class="cl-n">${li + 1}</span><div><h3>${esc(l.name)}</h3><small>${W(l.world).name} · ${pr.cleared}/${pr.total}${CAM.levelDone(l.id) ? ' · ✓ مكتمل' : ''}</small></div>
          ${unlocked ? '' : '<span class="cl-lock">🔒 أنهِ المستوى السابق</span>'}</header>
          <div class="cpath">${l.fights.map((f, i) => node(l, f, i)).join('<i class="cline"></i>')}</div></section>`;
      }).join('')}</div>`;
    refreshMenu();
  }

  function refreshMenu() {
    const b = $('menu-campaign'); if (!b) return;
    const n = CAM.next(), f = n && CAM.find(n);
    b.innerHTML = `الحملة${f ? `<small>${f.li + 1}-${f.fi + 1}</small>` : '<small>✓</small>'}`;
  }

  function preview(fightId) {
    const ui = UI(), x = CAM.find(fightId), f = x.fight, l = x.level, boss = f.boss ? LV.BOSS[l.world] : null;
    const pay = CAM.rewardsFor(fightId), st = CAM.stats(fightId);
    const h = pickHero();
    const unitsHTML = f.units.map(([id, star, , from], k) => `<div class="cu">${ui.portrait(AMB.DATA.UNITS[id], { k: 'cpv' + k + id })}${ui.stars(star)}${from > 1 ? `<small>من الجولة ${from}</small>` : ''}</div>`).join('');
    const heroes = C.ownedHeroes().map((id) => `<button class="hchip ${id === h ? 'on' : ''}" data-act="camHero" data-id="${id}" data-f="${fightId}">${ui.portrait(AMB.DATA.HEROES[id], { k: 'cph' + id })}<span>${AMB.DATA.HEROES[id].name}</span></button>`).join('');
    const reward = pay.replay ? `إعادة: ${icon('gem')} ${pay.shards}` : `${icon('gem')} ${pay.shards} شظية · +${pay.passXp} خبرة ممر${pay.pack ? ' · <b>باكج مجاني</b> لإنهاء المستوى' : ''}`;
    ui.modal(`<div class="cam-pv" style="--wc:${W(l.world).color}">
      <h2>${f.boss ? '👑 ' : ''}${esc(f.name)}</h2><div class="hint">${esc(l.name)} · قتال ${x.fi + 1} من ${l.fights.length} · أفضل من 3 جولات</div>
      ${boss ? `<div class="boss-box">${ui.portrait(AMB.DATA.HEROES[l.hero], { k: 'cpb' })}<div><b>قدرة الزعيم: ${boss.name}</b><p>${boss.text}</p><small>الزعيم يقاتل بنفسه في الساحة.</small></div></div>` : ''}
      <h4>تشكيلة الخصم</h4><div class="cam-units">${unitsHTML}</div>
      <h4>الجائزة</h4><div class="cam-reward">${reward}</div>
      <h4>بطلك</h4><div class="hchips">${heroes}</div>
      ${st.attempts ? `<div class="hint">محاولات: ${st.attempts} · فوز: ${st.wins}</div>` : ''}
      <div class="cam-go"><button class="btn primary big" data-act="camGo" data-id="${fightId}" ${h ? '' : 'disabled'}>قاتل!</button></div></div>`);
  }

  function start(fightId) {
    const ui = UI(), S = ui.S;
    S.mode = 'campaign'; S.campaign = { fightId }; S.picks = [pickHero(), null]; S.pickIdx = 0;
    ui.closeModal(); ui.startMatch();
  }

  /** results screen for a finished campaign fight (called from ui.js showResults) */
  function showResult(m, secs) {
    const ui = UI(), S = ui.S, fightId = S.campaign.fightId, x = CAM.find(fightId);
    if (!m._camDone) { m._camDone = true; S.camResult = CAM.recordResult(fightId, Object.assign(m.summary(0), { lifeLeft: m.players[0].life, roundsLost: m.players[0].stats.losses })); }
    const r = S.camResult, won = r.won, next = CAM.next(), nx = next && CAM.find(next);
    const score = `${m.players[0].stats.wins} – ${m.players[1].stats.wins}`;
    const pay = won ? [r.shards ? `${icon('gem')} +${r.shards} شظية` : '', r.passXp ? `+${r.passXp} خبرة ممر` : ''].filter(Boolean).join(' · ') : '';
    const pack = r.pack ? `<div class="cam-pack"><b>🎁 أكملت المستوى! باكج مجاني:</b><div class="cam-pack-row">${r.pack.cards.map((c, i) => `<div class="cu">${ui.portrait(C.def(c.id), { k: 'crp' + i + c.id })}<small class="r-${c.rarity}">${c.isNew ? 'جديدة!' : c.refund ? '+' + c.refund + ' شظية' : '+1 نسخة'}</small></div>`).join('')}</div></div>` : '';
    $('results').innerHTML = `<div class="res-stage ${won ? 'victory' : 'defeat'}" style="--wc:${W(x.level.world).color}"><div class="res-rays"></div>
        <div class="res-hero">${ui.portrait(won ? AMB.DATA.HEROES[m.players[0].heroId] : AMB.DATA.HEROES[x.level.hero], { bare: true, k: 'crh' })}<i class="sheen"></i></div>
        <div class="res-hname">${esc(x.fight.name)}</div></div>
      <div class="res-banner"><h1>${won ? (x.fight.boss ? 'هزمت الزعيم!' : 'فوز!') : 'خسارة'}</h1><p class="hint">النتيجة ${score} · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} دقيقة</p>
        ${won ? `<p class="cam-pay">${r.first ? pay : `إعادة: ${pay || 'بدون جائزة'}`}</p>` : '<p class="hint">ما خسرت شي. طوّر بطاقاتك أو غيّر التشكيلة وجرّب مرة ثانية.</p>'}</div>
      ${pack}
      <div class="cam-btns">
        ${won && nx ? `<button class="btn primary big" data-act="camGo" data-id="${next}">القتال التالي: ${esc(nx.fight.name)}</button>` : ''}
        <button class="btn ${won ? '' : 'primary'} big" data-act="camGo" data-id="${fightId}">${won ? 'أعد القتال' : 'حاول مرة ثانية'}</button>
        <button class="btn big ghost" data-act="go" data-to="campaign">خريطة الحملة</button>
        ${won ? '' : '<button class="btn big ghost" data-act="go" data-to="cards">طوّر بطاقاتي</button>'}</div>`;
    ui.show('results');
    ui.sfx(won ? 'win' : 'lose');
    if (won) setTimeout(() => { const el = document.querySelector('.res-hero'); if (el) ['#ffd24a', '#ffffff', W(x.level.world).color].forEach((c) => ui.burst(el, c, 14, { r: 150, s: 8 })); }, 250);
  }

  function installActions() {
    const ui = UI(); if (!ui || ui.ACT.camFight) return;
    Object.assign(ui.ACT, {
      camFight: (d) => preview(d.id),
      camHero: (d) => { hero = d.id; preview(d.f); },
      camGo: (d) => start(d.id),
    });
  }

  AMB.CampaignUI = { render, refreshMenu, showResult, installActions };
  if (UI()) installActions();
  refreshMenu();
})();
