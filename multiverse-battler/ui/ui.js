/*
 * Browser UI. Drives core/match.js; holds no game rules of its own.
 */
(function () {
  const AMB = globalThis.AMB;
  const { UNITS, HEROES, WORLDS, ROLES, ITEMS, SYNERGIES, ABILITY_TRIGGERS } = AMB.DATA;
  const CFG = AMB.CONFIG;
  const { icon, portrait, stars } = AMB.art;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = (n, d) => (Math.round(n * Math.pow(10, d || 0)) / Math.pow(10, d || 0)).toLocaleString('en-US');
  const lifeStr = (l) => Math.ceil(Math.max(0, l - 1e-6));

  const S = {
    screen: 'menu', mode: 'ai', difficulty: 'normal', picks: [null, null], pickIdx: 0,
    match: null, v: 0, sel: null, phase: 'idle', deadline: 0, paused: false, pausedLeft: 0,
    combat: null, speed: 2, raf: 0, queue: [], aiFirst: false, codexF: { world: '', role: '' },
    tokenEls: {}, startTs: 0, lastReport: null,
  };

  // ======================================================================= helpers
  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast ' + (kind || '');
    el.textContent = msg;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 2500);
  }
  function show(screen) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'scr-' + screen));
    S.screen = screen;
    window.scrollTo(0, 0);
  }
  function modal(html) { $('modal').innerHTML = `<button class="btn small ghost x" data-act="closeModal">✕</button>` + html; $('modal-back').classList.add('on'); }
  function closeModal() { $('modal-back').classList.remove('on'); }
  function overlay(html) { $('overlay').innerHTML = html; $('overlay').classList.add('on'); }
  function closeOverlay() { $('overlay').classList.remove('on'); $('overlay').innerHTML = ''; }

  const me = () => S.match.players[S.v];
  const opp = () => S.match.players[1 - S.v];
  const res = (r) => { if (!r.ok) toast(r.reason, 'err'); return r.ok; };

  // field coordinates -> % of the field box. viewer 1 sees the board rotated.
  function scr(x, y, viewer) {
    if (viewer === 1) { x = 3 - x; y = 4 - y; }
    return { left: ((x + 0.5) / 4) * 100, top: ((5.5 - y) / 7) * 100 };
  }

  // ======================================================================= menu / mode / hero
  function renderHeroSelect() {
    const who = S.mode === 'hotseat' ? `اللاعب ${S.pickIdx + 1}: اختر بطلك` : 'اختر بطلك';
    $('hero-title').textContent = who;
    const cur = S.picks[S.pickIdx];
    $('hero-grid').innerHTML = Object.values(HEROES).map((h) => {
      const W = WORLDS[h.world];
      const other = S.mode === 'hotseat' && S.pickIdx === 1 && S.picks[0] === h.id ? '<span class="pick-badge">اختيار اللاعب 1</span>' : '';
      const units = Object.values(UNITS).filter((u) => u.world === h.world).map((u) => u.name).join('، ');
      return `<div class="hero-card ${cur === h.id ? 'sel' : ''}" style="--wc:${W.color}" data-act="pickHero" data-id="${h.id}">${other}
        ${portrait(h, { k: 'hs' })}
        <h3>${h.name}</h3><div class="title">${h.title}</div>
        <div class="world">${W.name}</div>
        <div class="style">${h.style}</div>
        <div class="ab"><b>سلبية — ${h.passive.name}:</b> ${h.passive.text}</div>
        ${h.abilities.map((a) => `<div class="ab"><b>${a.name}</b> <span style="color:var(--ess)">(${a.cost} جوهر)</span>: ${a.text}</div>`).join('')}
        <div class="ab" style="color:var(--muted)">وحدات عالمه (رنين +${CFG.hero.resonancePerAlly * 100}%): ${units}</div>
        <div style="text-align:center;margin-top:8px"><button class="btn small" data-act="heroInfo" data-id="${h.id}">تفاصيل</button></div>
      </div>`;
    }).join('');
    $('hero-confirm').disabled = !cur;
    $('hero-confirm').textContent = S.mode === 'hotseat' && S.pickIdx === 0 ? 'تأكيد والانتقال للاعب 2' : 'ابدأ المباراة';
  }

  function startMatch() {
    const heroIds = Object.keys(HEROES);
    let players;
    if (S.mode === 'hotseat') {
      players = [{ heroId: S.picks[0], name: 'لاعب 1' }, { heroId: S.picks[1], name: 'لاعب 2' }];
    } else {
      const aiHero = heroIds[Math.floor(Math.random() * heroIds.length)];
      const styles = ['mono', 'mixed', 'balanced'];
      players = [
        { heroId: S.picks[0], name: 'أنت' },
        { heroId: aiHero, name: 'الخصم الآلي', isAI: true, aiStyle: styles[Math.floor(Math.random() * 3)], difficulty: S.mode === 'friendly' ? 'easy' : S.difficulty },
      ];
    }
    S.match = new AMB.Match({ mode: S.mode, players });
    S.startTs = Date.now();
    S.speed = 2;
    show('match');
    nextRound();
  }

  // ======================================================================= round flow
  function prepSeconds() {
    if (S.mode === 'hotseat') return CFG.match.hotseatPrepSeconds;
    if (S.mode === 'friendly') return CFG.match.prepSeconds * 2;
    return CFG.match.prepSeconds;
  }

  function nextRound() {
    const m = S.match;
    m.startRound();
    S.combat = null;
    if (S.mode === 'hotseat') {
      S.queue = m.round % 2 ? [0, 1] : [1, 0]; // alternate who shops first (shared pool)
      handoff(S.queue.shift());
    } else {
      S.aiFirst = m.round % 2 === 0;       // alternate first pick from the shared pool
      if (S.aiFirst) AMB.AI.prep(m, 1);
      beginPrep(0);
    }
  }

  function handoff(pi) {
    const p = S.match.players[pi];
    S.v = pi;
    S.phase = 'handoff';
    renderMatch();
    overlay(`<div class="ov-card"><h2>دور ${esc(p.name)}</h2>
      <p class="hint">الجولة ${S.match.round}. سلّم الجهاز لـ ${esc(p.name)}. لا ينظر الخصم أثناء التجهيز.</p>
      <p>${portrait(HEROES[p.heroId], { k: 'ho' }).replace('class="portrait', 'style="width:80px;height:80px" class="portrait')}</p>
      <button class="btn primary big" data-act="handoffGo" data-pi="${pi}">أنا جاهز</button></div>`);
  }

  function beginPrep(pi) {
    closeOverlay();
    S.v = pi;
    S.sel = null;
    S.phase = 'resources';
    S.paused = false;
    renderMatch();
    const p = me();
    const inc = p.lastIncome;
    if (inc) {
      const parts = [`+${inc.base} أساسي`];
      if (inc.interest) parts.push(`+${inc.interest} فائدة`);
      if (inc.streak) parts.push(`+${inc.streak} سلسلة`);
      if (inc.win) parts.push(`+${inc.win} فوز`);
      const ess = S.match.round > 1 ? CFG.economy.essencePerRound + (HEROES[p.heroId].passive.id === 'deep_reserve' ? 1 : 0) : 0;
      toast(`مرحلة الموارد: ${parts.join(' ')} ذهب${ess ? ` · +${ess} جوهر · +${CFG.economy.xpPerRound} خبرة` : ''}`, 'good');
    }
    setTimeout(() => {
      if (S.phase !== 'resources') return;
      S.phase = 'prep';
      S.deadline = Date.now() + prepSeconds() * 1000;
      renderMatch();
    }, 900);
  }

  function endPrep() {
    if (S.phase !== 'prep' && S.phase !== 'resources') return;
    const m = S.match;
    m.autoFill(S.v);
    S.sel = null;
    if (S.mode === 'hotseat' && S.queue.length) { handoff(S.queue.shift()); return; }
    if (S.mode !== 'hotseat' && !S.aiFirst) AMB.AI.prep(m, 1);
    startCombat();
  }

  setInterval(() => {
    if (S.screen !== 'match' || S.phase !== 'prep') return;
    const el = document.querySelector('.timer');
    if (S.paused) return;
    const left = Math.max(0, S.deadline - Date.now());
    if (el) { el.textContent = Math.ceil(left / 1000) + 's'; el.classList.toggle('warn', left < 6000); }
    if (left <= 0) endPrep();
  }, 200);

  // ======================================================================= combat playback
  function startCombat() {
    const m = S.match;
    closeOverlay();
    S.combatViewer = 0;
    S.v = 0;
    S.combat = m.createCombat(true);
    S.phase = 'combat';
    renderMatch();
    buildTokens();
    let last = performance.now(), acc = 0;
    const step = (ts) => {
      if (S.phase !== 'combat') return;
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (!S.paused) {
        acc += dt * S.speed;
        while (acc >= CFG.combat.dt && !S.combat.over) { S.combat.step(); acc -= CFG.combat.dt; }
      }
      drawCombat();
      if (S.combat.over) { setTimeout(finishCombat, 700); return; }
      S.raf = requestAnimationFrame(step);
    };
    S.raf = requestAnimationFrame(step);
  }

  function skipCombat() {
    if (S.phase !== 'combat') return;
    S.combat.runToEnd();
    S.combat.drainEvents();
    drawCombat(true);
  }

  function finishCombat() {
    if (S.phase !== 'combat') return;
    cancelAnimationFrame(S.raf);
    S.phase = 'result';
    const m = S.match;
    const rep = m.resolveCombat(S.combat.result);
    S.lastReport = rep;
    renderMatch(true);
    const names = m.players.map((p) => p.name);
    let title, cls;
    if (rep.winner === null) { title = 'تعادل'; cls = ''; }
    else if (S.mode === 'hotseat') { title = `فاز ${esc(names[rep.winner])} بالجولة`; cls = 'win'; }
    else { title = rep.winner === 0 ? 'فزت بالجولة!' : 'خسرت الجولة'; cls = rep.winner === 0 ? 'win' : 'lose'; }
    const rows = rep.players.map((r, i) => `<tr><td>${esc(names[i])} ${r.heroKilled ? '— <b style="color:var(--red)">سقط البطل!</b>' : ''}</td>
      <td>${fmt(r.direct, 1)}</td><td>${r.backlash}</td><td>${r.collapse || '-'}</td><td><b>${lifeStr(r.lifeAfter)}</b></td></tr>`).join('');
    const over = m.isOver;
    overlay(`<div class="ov-card"><h2 class="${cls}">${title}</h2>
      <div class="hint">الجولة ${rep.round} · مدة القتال ${fmt(rep.duration, 1)} ث</div>
      <table><tr><th></th><th>ضرر مباشر</th><th>ارتداد الخسارة</th><th>انهيار الصدع</th><th>الحياة</th></tr>${rows}</table>
      <p class="hint">الضرر المباشر = ضربات تلقاها البطل بعد انكشافه أو في الساحة. ارتداد الخسارة = ${CFG.damage.lossBase} + الجولة×${CFG.damage.lossPerRound} + نجوم وحدات الخصم الناجية.</p>
      <button class="btn primary big" data-act="${over ? 'toResults' : 'nextRound'}">${over ? 'عرض النتائج' : 'الجولة التالية'}</button></div>`);
  }

  function buildTokens() {
    const c = S.combat;
    S.tokenEls = {};
    const html = c.fighters.filter((f) => f.onBoard).map((f) => {
      const def = f.isHero ? HEROES[f.defId] : UNITS[f.defId];
      const enemy = f.side !== S.combatViewer;
      return `<div class="token ${enemy ? 'enemy' : ''} ${f.isHero ? 'herotok' : ''}" id="tok${f.id}">
        ${portrait(def, { k: 't' + f.id })}<div class="shieldring"></div>${f.isHero ? icon('crown', 'hero-crown') : stars(f.star)}
        <div class="bars"><div class="hp"><b></b><i></i></div>${f.skill ? '<div class="mp"><i></i></div>' : ''}</div></div>`;
    }).join('');
    $('tokens').innerHTML = html;
    c.fighters.forEach((f) => { const el = $('tok' + f.id); if (el) S.tokenEls[f.id] = { el, hp: el.querySelector('.hp i'), lag: el.querySelector('.hp b'), mp: el.querySelector('.mp i'), lagW: 100 }; });
    $('fx').innerHTML = '';
    $('floats').innerHTML = '';
  }

  function posOf(f) { return scr(f.x, f.y, S.combatViewer); }

  function addFloat(left, top, text, cls) {
    const fl = $('floats');
    if (fl.childElementCount > 40) fl.firstElementChild.remove();
    const el = document.createElement('div');
    el.className = 'float ' + (cls || '');
    el.style.left = left + '%';
    el.style.top = top + '%';
    el.textContent = text;
    fl.appendChild(el);
    setTimeout(() => el.remove(), cls && cls.includes('big') ? 1600 : 900);
  }

  function drawCombat(skipFx) {
    const c = S.combat;
    const byId = {};
    c.fighters.forEach((f) => (byId[f.id] = f));
    for (const f of c.fighters) {
      const t = S.tokenEls[f.id];
      if (!t) continue;
      const p = posOf(f);
      t.el.style.left = p.left + '%';
      t.el.style.top = p.top + '%';
      const pct = Math.max(0, (f.hp / f.maxHp) * 100);
      t.hp.style.width = pct + '%';
      t.lagW = Math.max(pct, t.lagW - 1.2);
      t.lag.style.width = t.lagW + '%';
      if (t.mp) t.mp.style.width = Math.min(100, (f.mana / f.maxMana) * 100) + '%';
      t.el.classList.toggle('dead', !f.alive || (f.isHero && !f.onBoard));
      t.el.classList.toggle('stunned', f.stun > 0);
      t.el.classList.toggle('shielded', f.shield > 1);
    }
    renderPosts();
    // clock
    const clock = document.querySelector('.combat-ctrl .clock');
    if (clock) clock.textContent = fmt(c.t, 1) + 's';
    const fury = document.querySelector('.combat-ctrl .fury');
    if (fury) fury.textContent = c.t > CFG.combat.furyStart ? `غضب ×${fmt(c.fury(), 2)}` : (c.assault ? 'هجوم على مركز القيادة!' : '');

    const events = c.drainEvents();
    if (skipFx) return;
    const fx = $('fx');
    for (const e of events) {
      const f = e.id != null ? byId[e.id] : null;
      if (e.type === 'damage' && f) {
        if (e.amount < 4 && !e.crit) continue;
        const p = posOf(f);
        addFloat(p.left + (Math.random() * 8 - 4), p.top - 6, e.amount, e.crit ? 'crit' : e.skill ? 'skill' : '');
        const t = S.tokenEls[f.id];
        if (t) { t.el.classList.add('hit'); setTimeout(() => t.el.classList.remove('hit'), 90); }
      } else if (e.type === 'heal' && f) {
        const p = posOf(f); addFloat(p.left, p.top - 10, '+' + e.amount, 'heal');
      } else if (e.type === 'cast' && f) {
        const t = S.tokenEls[f.id];
        if (t) { t.el.classList.remove('cast'); void t.el.offsetWidth; t.el.classList.add('cast'); }
        const p = posOf(f); addFloat(p.left, p.top + 9, e.name, 'label');
      } else if (e.type === 'attack' && byId[e.from] && byId[e.to]) {
        const a = posOf(byId[e.from]), b = posOf(byId[e.to]);
        const col = byId[e.from].side === S.combatViewer ? '#7ff5ff' : '#ff8fa3';
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ln.setAttribute('x1', a.left * 4); ln.setAttribute('y1', a.top * 5.6); ln.setAttribute('x2', b.left * 4); ln.setAttribute('y2', b.top * 5.6);
        ln.setAttribute('stroke', col); ln.setAttribute('stroke-width', e.ranged ? 2 : 4); ln.setAttribute('stroke-linecap', 'round');
        ln.setAttribute('opacity', e.ranged ? 0.8 : 0.5);
        ln.style.transition = 'opacity .25s';
        fx.appendChild(ln);
        requestAnimationFrame(() => (ln.style.opacity = 0));
        setTimeout(() => ln.remove(), 280);
      } else if (e.type === 'blast') {
        const p = scr(e.x, e.y, S.combatViewer);
        const ci = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ci.setAttribute('cx', p.left * 4); ci.setAttribute('cy', p.top * 5.6); ci.setAttribute('r', e.r * 90);
        ci.setAttribute('fill', '#ff9f4a55'); ci.setAttribute('stroke', '#ffcf4a'); ci.setAttribute('stroke-width', 3);
        ci.style.transition = 'opacity .6s'; fx.appendChild(ci);
        requestAnimationFrame(() => (ci.style.opacity = 0)); setTimeout(() => ci.remove(), 650);
      } else if (e.type === 'heroAbility' || e.type === 'spell') {
        const top = e.side === S.combatViewer ? 70 : 30;
        addFloat(50, top, (e.type === 'spell' ? '✦ ' : '⚡ ') + e.name, 'big');
      } else if (e.type === 'exposed') {
        const top = e.side === S.combatViewer ? 84 : 16;
        addFloat(50, top, 'سقط خط الدفاع — البطل مكشوف!', 'big');
      } else if (e.type === 'assault') {
        addFloat(50, e.side === S.combatViewer ? 80 : 20, 'هجوم على مركز القيادة!', 'big');
      } else if (e.type === 'retreat') {
        addFloat(50, e.side === S.combatViewer ? 80 : 20, 'انسحب البطل إلى مركز القيادة', 'big');
      } else if (e.type === 'sealed') {
        addFloat(50, e.side === S.combatViewer ? 88 : 12, 'تحصّن مركز القيادة (حد الضرر)', 'label');
      } else if (e.type === 'leap' && f) {
        const p = posOf(f); addFloat(p.left, p.top + 8, 'قفزة!', 'label');
      } else if (e.type === 'stun' && f) {
        const p = posOf(f); addFloat(p.left, p.top + 4, 'شلل', 'label');
      }
    }
  }

  // ======================================================================= match rendering
  function renderMatch(keepTokens) {
    if (!S.match) return;
    renderTop();
    renderSlots();
    if (S.phase !== 'combat' && !keepTokens) { $('tokens').innerHTML = ''; $('fx').innerHTML = ''; $('floats').innerHTML = ''; }
    renderPosts();
    renderBench();
    renderShop();
    renderLeft();
    renderRight();
    renderCombatCtrl();
  }

  function renderTop() {
    const m = S.match, p = me(), o = opp();
    const ph = S.phase;
    const steps = [['resources', 'الموارد'], ['shop', 'الشراء والتطوير'], ['form', 'الترتيب والقدرات'], ['combat', 'القتال'], ['result', 'النتائج']];
    const activeIdx = { resources: [0], prep: [1, 2], handoff: [], combat: [3], result: [4] }[ph] || [];
    const phases = steps.map(([, n], i) => `<span class="phase ${activeIdx.includes(i) ? 'on' : activeIdx.length && i < Math.min(...activeIdx) ? 'done' : ''}">${i + 1}. ${n}</span>`).join('');
    const need = m.xpNeeded(p);
    const left = ph === 'prep' ? Math.ceil(Math.max(0, S.deadline - Date.now()) / 1000) + 's' : '—';
    const avail = p.essence - m.reservedEssence(p);
    $('topbar').innerHTML = `
      <span class="tb-round">الجولة ${m.round}</span>
      <div class="phases">${phases}</div>
      <span class="timer" title="مؤقت مرحلة التجهيز">${S.paused ? '⏸' : left}</span>
      <span class="tb-spacer"></span>
      <span class="lifechip me" title="حياة بطلك">${portrait(HEROES[p.heroId], { k: 'tb0' })}${esc(p.name)} ${icon('heart')} ${lifeStr(p.life)}</span>
      <span class="lifechip" title="حياة بطل الخصم">${portrait(HEROES[o.heroId], { k: 'tb1' })}${esc(o.name)} ${icon('heart')} ${lifeStr(o.life)}</span>
      <span class="res gold" title="الذهب">${icon('gold')} ${p.gold}</span>
      <span class="res ess" title="الجوهر: متاح / الإجمالي (يُدفع فقط عند تفعيل القدرة)">${icon('essence')} ${avail}/${p.essence}</span>
      <span class="lvl" title="المستوى = الحد الأقصى للوحدات في الساحة">مستوى ${p.level} <span class="xpbar"><i style="width:${need ? (p.xp / need) * 100 : 100}%"></i></span> <small style="color:var(--muted)">${need ? p.xp + '/' + need : 'MAX'}</small></span>
      <button class="btn small" data-act="pause" title="إيقاف مؤقت">${S.paused ? '▶' : '⏸'}</button>
      <button class="btn small" data-act="menuMatch">☰</button>`;
  }

  function renderSlots() {
    const p = me();
    const v = S.v;
    const m = S.match;
    const prep = S.phase === 'prep' || S.phase === 'resources';
    let html = '';
    if (S.phase === 'combat' || S.phase === 'result') { $('slots').innerHTML = ''; return; }
    AMB.SLOTS.forEach((slot) => {
      const g = AMB.combatGeom.slotPos(v, slot);
      const pos = scr(g.x, g.y, v);
      const u = p.board[slot];
      const heroHere = p.summoned && p.heroSlot === slot;
      let inner = '';
      if (u) inner = pieceHTML(u, { sel: S.sel && S.sel.kind === 'unit' && S.sel.uid === u.uid });
      else if (heroHere) inner = heroPieceHTML(p);
      html += `<div class="slot mine" style="left:${pos.left}%;top:${pos.top}%" data-act="slot" data-slot="${slot}" data-drop="board:${slot}">${inner}<span class="rowtag">${g.row === 'front' ? 'أمامي' : 'خلفي'}</span></div>`;
    });
    // opponent: last formation they fought with (scouting)
    const sc = m.scout[1 - v];
    AMB.SLOTS.forEach((slot) => {
      const g = AMB.combatGeom.slotPos(1 - v, slot);
      const pos = scr(g.x, g.y, v);
      let inner = '';
      if (sc) {
        const u = sc.units.find((x) => x.slot === slot);
        if (u) inner = `<div class="piece ghost">${portrait(UNITS[u.defId], { k: 'sc' + slot })}${stars(u.star)}</div>`;
        else if (sc.summoned && sc.heroSlot === slot) inner = `<div class="piece ghost">${portrait(HEROES[sc.heroId], { k: 'sch' })}</div>`;
      }
      html += `<div class="slot enemy" style="left:${pos.left}%;top:${pos.top}%" ${prep ? '' : ''}>${inner}</div>`;
    });
    html += `<div class="fieldlabel" style="top:36%">${sc ? 'آخر تشكيلة للخصم (استطلاع)' : 'الخصم — لم يقاتل بعد'}</div>`;
    html += `<div class="fieldlabel" style="top:51.5%">صفّك الأمامي ↓</div>`;
    $('slots').innerHTML = html;
  }

  function renderPosts() {
    const m = S.match;
    const inCombat = S.combat && (S.phase === 'combat' || S.phase === 'result');
    const viewer = inCombat ? S.combatViewer : S.v;
    let html = '';
    [viewer, 1 - viewer].forEach((side) => {
      const p = m.players[side];
      const h = HEROES[p.heroId];
      const pos = scr(1.5, side === viewer ? -1 : 5, 0);
      let life = p.life, onBoard = p.summoned, exposed = false, status;
      if (inCombat) {
        const hf = S.combat.sides[side].hero;
        life = hf.hp / CFG.combat.heroHpScale;
        onBoard = hf.onBoard;
        exposed = S.combat.sides[side].exposed;
        status = onBoard ? (S.combat.targetable(hf) ? '<span class="st risk">في الساحة — قابل للاستهداف</span>' : '<span class="st safe">في الساحة — محمي بخط الدفاع</span>')
          : hf.sealed ? '<span class="st safe">مركز القيادة محصّن</span>' : exposed ? '<span class="st risk">مكشوف! يمكن مهاجمته</span>' : '<span class="st safe">محمي بخط الدفاع</span>';
      } else {
        const board = side === S.v ? p.board : null;
        const front = board ? Object.keys(board).filter((s) => s[0] === 'f').length : null;
        status = onBoard ? '<span class="st">مستدعى إلى الساحة</span>' : front === 0 ? '<span class="st risk">لا يوجد خط دفاع!</span>' : front ? `<span class="st safe">محمي (${front} في الصف الأمامي)</span>` : '<span class="st">مركز القيادة</span>';
      }
      html += `<div class="post ${onBoard && !inCombat ? 'empty-hero' : ''} ${exposed && !onBoard ? 'exposed' : ''}" style="top:${pos.top}%">
        ${portrait(h, { k: 'post' + side })}
        <div class="pl"><div class="pn">${esc(p.name)} · ${h.name}</div>
        <div class="lifebar"><i style="width:${Math.max(0, (life / p.maxLife) * 100)}%"></i></div>
        <div class="st">${icon('heart')} ${lifeStr(life)}/${p.maxLife} — ${status}</div></div></div>`;
    });
    let el = document.getElementById('posts');
    if (!el) { el = document.createElement('div'); el.id = 'posts'; el.className = 'slots'; el.style.pointerEvents = 'none'; $('field').appendChild(el); }
    el.innerHTML = html;
  }

  function pieceHTML(u, o) {
    const def = UNITS[u.defId];
    const items = u.items.length ? `<div class="itm">${u.items.map((it) => `<span title="${esc(ITEMS[it].name)}">${icon(ITEMS[it].icon)}</span>`).join('')}</div>` : '';
    return `<div class="piece ${o && o.sel ? 'sel' : ''}" draggable="true" data-drag="unit:${u.uid}" title="${esc(def.name)} ${'★'.repeat(u.star)} — ${ROLES[def.role].name} / ${WORLDS[def.world].name}">
      ${portrait(def, { k: u.uid })}${stars(u.star)}${items}</div>`;
  }
  function heroPieceHTML(p) {
    const sel = S.sel && S.sel.kind === 'hero';
    return `<div class="piece ${sel ? 'sel' : ''}" draggable="true" data-drag="hero" title="البطل ${esc(HEROES[p.heroId].name)} — في الساحة">
      ${portrait(HEROES[p.heroId], { k: 'hb' })}${icon('crown', 'hero-crown')}</div>`;
  }

  function renderBench() {
    const p = me();
    if (S.phase === 'combat' || S.phase === 'result') {
      $('bench').innerHTML = `<span class="lbl">احتياط</span>` + p.bench.map((u) => `<div class="bslot">${u ? `<div class="piece ghost" style="opacity:.6">${portrait(UNITS[u.defId], { k: 'bc' + u.uid })}${stars(u.star)}</div>` : ''}</div>`).join('');
      return;
    }
    $('bench').innerHTML = `<span class="lbl">احتياط</span>` + p.bench.map((u, i) =>
      `<div class="bslot" data-act="bench" data-idx="${i}" data-drop="bench:${i}">${u ? pieceHTML(u, { sel: S.sel && S.sel.kind === 'unit' && S.sel.uid === u.uid }) : ''}</div>`).join('');
  }

  function renderShop() {
    const m = S.match, p = me();
    const prep = S.phase === 'prep' || S.phase === 'resources';
    const E = CFG.economy;
    if (!prep) {
      $('shopbar').innerHTML = `<div class="hint" style="padding:10px">المتجر مغلق أثناء ${S.phase === 'combat' ? 'القتال' : 'النتائج'}. ${S.phase === 'combat' ? 'القتال تلقائي بالكامل — قراراتك في التجهيز هي ما يحسم النتيجة.' : ''}</div>`;
      return;
    }
    const owned = {};
    m.allUnits(p).forEach((u) => { owned[u.defId] = owned[u.defId] || { n: 0, s1: 0 }; owned[u.defId].n++; if (u.star === 1) owned[u.defId].s1++; });
    const cards = p.shop.map((id, i) => {
      if (!id) return `<div class="card empty"><div class="cn">—</div></div>`;
      const d = UNITS[id];
      const ok = m.canBuy(S.v, i).ok;
      const ow = owned[id];
      const pair = ow && ow.s1 >= 2;
      return `<div class="card ${ok ? '' : 'cant'} ${pair ? 'pair' : ''}" style="--tc:var(--t${d.tier})" data-act="buy" data-idx="${i}" title="${esc(d.skill.name)}: ${esc(d.skill.text)}">
        <span class="cost">${icon('gold')}${d.cost}</span><span class="info" data-act="detail" data-id="${id}">i</span>
        ${portrait(d, { k: 'sh' + i })}<div class="cn">${d.name}</div>
        <div class="cm" style="color:${WORLDS[d.world].color}">${WORLDS[d.world].name}</div><div class="cm">${ROLES[d.role].name}</div>
        ${ow ? `<span class="owned">${pair ? 'سيتطور ★★!' : 'تملك ' + ow.n}</span>` : ''}</div>`;
    }).join('');
    const items = p.itemShop.map((id, i) => {
      if (!id) return `<div class="card empty"><div class="cn">—</div></div>`;
      const it = ITEMS[id];
      return `<div class="card ${it.kind} ${p.gold >= it.cost ? '' : 'cant'}" data-act="buyItem" data-idx="${i}" title="${esc(it.text)}">
        <span class="cost">${icon('gold')}${it.cost}</span>${icon(it.icon, 'big-ic')}<div class="cn">${it.name}</div><div class="cm">${it.kind === 'equip' ? 'معدة' : 'تعويذة'}</div></div>`;
    }).join('');
    const freeR = p.freeRerolls > 0;
    $('shopbar').innerHTML = `
      <div class="shop-actions">
        <button class="btn" data-act="reroll" title="اختصار: D">تحديث <span>${freeR ? 'مجاني' : icon('gold') + E.rerollCost}</span></button>
        <button class="btn" data-act="xp" ${p.level >= E.maxLevel ? 'disabled' : ''} title="اختصار: F">+${E.xpPerBuy} خبرة <span>${icon('gold')}${E.xpCost}</span></button>
        <button class="btn ${p.shopLocked ? 'on' : ''}" data-act="lock" title="يبقي نفس العروض للجولة القادمة">${p.shopLocked ? '🔒 مقفل' : '🔓 قفل'}</button>
      </div>
      <div class="shop-cards">${cards}</div>
      <div class="item-cards">${items}</div>
      <div class="shop-actions">
        <button class="btn" data-act="upgrades">شاشة التطوير</button>
        <button class="btn primary ready-btn" data-act="ready" title="Enter">جاهز ⚔</button>
      </div>`;
  }

  function synergyHTML(list) {
    if (!list.length) return '<div class="hint">ضع وحدات في الساحة لتفعيل التآزر.</div>';
    return list.map((s) => {
      const color = s.kind === 'world' ? WORLDS[s.id].color : s.kind === 'special' ? '#ffcf4a' : '#3ee6ff';
      const tiers = s.tiers.map((t, i) => (i === s.activeTier ? `<b>${t.n}</b>` : t.n)).join(' › ');
      const on = s.activeTier >= 0;
      const desc = on ? s.tiers[s.activeTier].text : `عند ${s.tiers[0].n}: ${s.tiers[0].text}`;
      return `<div class="syn ${on ? 'on' : ''}" style="--sc:${color}" title="${esc(s.tiers.map((t) => t.n + ': ' + t.text).join('\n'))}">
        <span class="cnt">${s.count}${s.nextN ? '/' + s.nextN : ''}</span><span class="nm">${s.name}</span><span class="tiers">${tiers}</span></div>
        <div class="syn-desc">${desc}</div>`;
    }).join('');
  }

  function renderLeft() {
    const m = S.match, p = me(), o = opp();
    const board = Object.values(p.board);
    const ev = AMB.synergy.evaluate(board, p.heroId);
    const front = Object.keys(p.board).filter((s) => s[0] === 'f').length;
    const heroFront = p.summoned && p.heroSlot[0] === 'f';
    let guard;
    if (heroFront) guard = `<div class="guard-status risk"><b>البطل في الصف الأمامي</b> — يمكن استهدافه مباشرة منذ بداية القتال.</div>`;
    else if (front === 0) guard = `<div class="guard-status risk"><b>لا يوجد خط دفاع!</b> بطلك مكشوف منذ بداية القتال. ضع وحدات في الصف الأمامي.</div>`;
    else guard = `<div class="guard-status safe"><b>خط الدفاع: ${front}</b> وحدة أمامية. لا يمكن استهداف بطلك حتى تسقط جميعها (القتلة يقفزون للصف الخلفي لكن لا يضربون البطل المحمي).</div>`;
    const hw = WORLDS[HEROES[p.heroId].world];
    const sc = m.scout[1 - S.v];
    const oppSyn = sc ? AMB.synergy.evaluate(sc.units, sc.heroId).list.filter((s) => s.activeTier >= 0) : [];
    const timeline = m.history.map((r) => `<span class="${r.winner === null ? 'wd' : r.winner === S.v ? 'w0' : 'w1'}" title="الجولة ${r.round}">${r.round}</span>`).join('');
    $('panel-left').innerHTML = `
      <section><h4>حماية البطل</h4>${guard}</section>
      <section><h4>التآزر <small>${board.length}/${p.level} وحدات</small></h4>
        <div class="syn ${ev.resonance ? 'on' : ''}" style="--sc:${hw.color}" title="كل وحدة من عالم بطلك تكتسب +${CFG.hero.resonancePerAlly * 100}% صحة وهجوم"><span class="cnt">${ev.resonance}</span><span class="nm">رنين البطل (${hw.name})</span></div>
        <div class="syn-desc">كل وحدة من عالم بطلك: +${CFG.hero.resonancePerAlly * 100}% صحة وهجوم.</div>
        ${synergyHTML(ev.list)}</section>
      <section><h4>الخصم</h4>
        <div class="hero-box">${portrait(HEROES[o.heroId], { k: 'lo' })}<div><div class="nm">${esc(o.name)}</div><div class="ti">${HEROES[o.heroId].name} · ${WORLDS[HEROES[o.heroId].world].name}</div>
        <div class="ti">مستوى ${o.level} · ${icon('heart')} ${lifeStr(o.life)}</div></div></div>
        ${oppSyn.length ? '<div class="hint" style="margin-top:6px">تآزر آخر تشكيلة: ' + oppSyn.map((s) => s.name).join('، ') + '</div>' : ''}
        ${sc && sc.summoned ? '<div class="hint">استدعى بطله في الجولة السابقة.</div>' : ''}</section>
      <section><h4>سجل الجولات</h4><div class="timeline">${timeline || '<span class="hint">—</span>'}</div></section>`;
  }

  function renderRight() {
    const m = S.match, p = me();
    const h = HEROES[p.heroId];
    const prep = S.phase === 'prep' || S.phase === 'resources';
    const avail = p.essence - m.reservedEssence(p);
    const abil = h.abilities.map((a) => {
      const cost = m.abilityCost(p, a);
      const trig = p.abilities[a.id] || '';
      const fired = S.combat && S.phase !== 'prep' && S.combat.sides[S.v] && S.combat.sides[S.v].abilities.find((x) => x.def.id === a.id && x.fired);
      const opts = [`<option value="">— غير مجهزة —</option>`].concat(Object.values(ABILITY_TRIGGERS).map((t) => `<option value="${t.id}" ${trig === t.id ? 'selected' : ''}>تفعيل: ${t.name}</option>`)).join('');
      return `<div class="ability ${trig ? 'armed' : ''}"><div class="ah"><span>${a.name}</span><span class="cost">${icon('essence')}${cost}${cost !== a.cost ? ` <s style="opacity:.5">${a.cost}</s>` : ''}</span></div>
        <p>${a.text}</p>${prep ? `<select data-ab="${a.id}">${opts}</select>` : `<div class="hint">${trig ? (fired ? '✔ فُعّلت في هذا القتال' : 'مجهزة: ' + ABILITY_TRIGGERS[trig].name) : 'غير مجهزة'}</div>`}</div>`;
    }).join('');
    const summonTxt = p.summoned ? 'إعادة البطل إلى مركز القيادة' : 'استدعاء البطل إلى الساحة';
    const bag = [];
    for (let i = 0; i < CFG.economy.itemBenchSize; i++) {
      const id = p.items[i];
      if (!id) { bag.push('<div class="bagslot"></div>'); continue; }
      const it = ITEMS[id];
      const sel = S.sel && S.sel.kind === 'item' && S.sel.idx === i;
      bag.push(`<div class="bagslot ${it.kind} ${sel ? 'sel' : ''}" data-act="bagSel" data-idx="${i}" title="${esc(it.name + ': ' + it.text)}">${icon(it.icon)}</div>`);
    }
    const armed = p.armedSpells.map((id, i) => `<span class="chip" data-act="disarm" data-idx="${i}" title="اضغط لإلغاء التجهيز">${icon(ITEMS[id].icon)} ${ITEMS[id].name} ✕</span>`).join('');
    $('panel-right').innerHTML = `
      <section><div class="hero-box">${portrait(h, { k: 'rh' })}<div style="flex:1"><div class="nm">${h.name}</div><div class="ti">${h.title} · ${WORLDS[h.world].name}</div>
        <div class="lifebar-big"><i style="width:${(p.life / p.maxLife) * 100}%"></i></div><div class="ti">${icon('heart')} ${lifeStr(p.life)} / ${p.maxLife}</div></div></div>
        <div class="passive"><b>${h.passive.name}:</b> ${h.passive.text}</div>
        ${prep ? `<button class="btn summon-btn ${p.summoned ? 'on' : ''}" data-act="summon">${summonTxt}</button>
        <div class="hint">${p.summoned ? 'البطل يقاتل في الساحة (اسحبه لتغيير موقعه).' : 'البطل الآن في مركز القيادة خلف صفوفك.'}
        الاستدعاء: يهاجم بقوة ${h.board.atk + CFG.hero.boardAtkPerRound * m.round}، الحلفاء +${CFG.hero.summonAuraAtk * 100}% هجوم، القدرات أرخص بـ${CFG.hero.summonAbilityDiscount}.
        المخاطرة: يتلقى الضرر كاملًا (والضرر المساحي يصيبه حتى لو كان محميًا)، وينسحب بعد خسارة ${CFG.combat.summonKnockout} حياة، ووصول حياته للصفر = خسارة فورية.</div>` : ''}
      </section>
      <section><h4>قدرات البطل <span class="cost" style="color:var(--ess)">${icon('essence')} متاح ${avail}</span></h4>${abil}
        <div class="hint">يُدفع الجوهر فقط إذا تفعّلت القدرة أثناء القتال.</div></section>
      <section><h4>المعدات والتعاويذ</h4><div class="bag">${bag.join('')}</div>
        ${armed ? `<div class="armed-spells">${armed}</div>` : ''}
        <div class="hint" style="margin-top:6px">اضغط معدة ثم وحدة لتجهيزها (حد ${CFG.economy.maxItemsPerUnit} لكل وحدة). التعاويذ تُجهَّز للقتال القادم فقط.</div></section>
      <section><h4>التحديد</h4>${selectionHTML()}</section>
      <section class="hint">اضغط وحدة ثم خانة لنقلها (أو اسحبها). اسحب وحدة إلى المتجر لبيعها.
        اختصارات: <span class="kbd">D</span> تحديث · <span class="kbd">F</span> خبرة · <span class="kbd">E</span> بيع المحدد · <span class="kbd">Enter</span> جاهز</section>`;
  }

  function selectionHTML() {
    const m = S.match, p = me();
    const prep = S.phase === 'prep' || S.phase === 'resources';
    if (!S.sel || !prep) return '<div class="hint">لا شيء محدد.</div>';
    if (S.sel.kind === 'unit') {
      const u = m.findUnit(p, S.sel.uid);
      if (!u) return '';
      const d = UNITS[u.defId];
      const sm = CFG.stars.mult[u.star];
      return `<div class="selinfo"><b>${d.name}</b> ${stars(u.star)}<br>
        <span class="pill" style="--pc:${WORLDS[d.world].color}">${WORLDS[d.world].name}</span><span class="pill">${ROLES[d.role].name}</span><span class="pill" style="--pc:var(--t${d.tier})">فئة ${d.tier}</span><br>
        صحة ${fmt(d.hp * sm)} · هجوم ${fmt(d.atk * sm)} · مدى ${d.range}<br>
        <b>${d.skill.name}:</b> ${d.skill.text}
        ${u.items.length ? '<br>معدات: ' + u.items.map((i) => ITEMS[i].name).join('، ') : ''}
        <div class="row"><button class="btn small" data-act="detail" data-id="${d.id}" data-star="${u.star}">التفاصيل</button>
        <button class="btn small danger" data-act="sell">بيع +${m.sellValue(u)} ذهب</button>
        ${u.items.length ? '<button class="btn small" data-act="unequip">نزع المعدات</button>' : ''}</div></div>`;
    }
    if (S.sel.kind === 'item') {
      const it = ITEMS[p.items[S.sel.idx]];
      if (!it) return '';
      return `<div class="selinfo"><b>${it.name}</b> (${it.kind === 'equip' ? 'معدة' : 'تعويذة'})<br>${it.text}
        <div class="row">${it.kind === 'spell' ? '<button class="btn small" data-act="arm">تجهيز للقتال القادم</button>' : '<span class="hint">اضغط على وحدة لتجهيزها بهذه المعدة.</span>'}
        <button class="btn small danger" data-act="sellItem">بيع +${Math.floor(it.cost / 2)}</button></div></div>`;
    }
    if (S.sel.kind === 'hero') return '<div class="hint">البطل محدد: اضغط خانة في ساحتك لنقله.</div>';
    return '';
  }

  function renderCombatCtrl() {
    const el = $('combat-ctrl');
    if (S.phase === 'combat') {
      el.innerHTML = `<span class="clock">0.0s</span>
        ${[1, 2, 4].map((s) => `<button class="btn small ${S.speed === s ? 'on' : ''}" data-act="speed" data-v="${s}">${s}x</button>`).join('')}
        <button class="btn small" data-act="skip">تخطي ⏭</button><span class="fury"></span>`;
    } else if (S.phase === 'prep' || S.phase === 'resources') {
      const p = me();
      el.innerHTML = `<span class="hint">${Object.keys(p.board).length}/${p.level} وحدات في الساحة${p.summoned ? ' + البطل' : ''} · مرحلة التجهيز</span>`;
    } else el.innerHTML = '';
  }

  // ======================================================================= modals
  function unitDetail(id, star) {
    const d = UNITS[id];
    const W = WORLDS[d.world], R = ROLES[d.role];
    const SM = CFG.stars.mult;
    const rows = [
      ['الصحة', (s) => d.hp * SM[s]], ['الهجوم', (s) => d.atk * SM[s]], ['سرعة الهجوم (ضربة/ث)', () => d.as, 2],
      ['الضرر في الثانية', (s) => d.atk * SM[s] * d.as], ['المدى', () => d.range], ['الدفاع (تقليل ضرر)', () => d.def * 100, 0, '%'],
      ['فرصة الحرجة', () => d.crit * 100, 0, '%'], ['المانا للمهارة', () => d.mana],
    ];
    const sk = d.skill;
    const vals = [['dmg', 'الضرر'], ['heal', 'العلاج'], ['shield', 'الدرع'], ['dps', 'ضرر/ث'], ['stun', 'الشلل (ث)'], ['pct', 'سرعة الهجوم %']];
    const skRows = vals.filter(([k]) => sk[k]).map(([k, n]) => `<tr><td>${n}</td>${sk[k].map((v, i) => `<td>${k === 'pct' ? Math.round(v * 100) + '%' : v}${i ? `<div class="delta">+${Math.round(((v - sk[k][0]) / sk[k][0]) * 100)}%</div>` : ''}</td>`).join('')}</tr>`).join('');
    const synOf = (sid) => SYNERGIES[sid].tiers.map((t) => `<div class="hint">• ${t.n}: ${t.text}</div>`).join('');
    let match = '';
    if (S.match) {
      const p = me();
      const ow = S.match.allUnits(p).filter((u) => u.defId === id);
      match = `<div class="hint">في هذه المباراة: تملك ${ow.length ? ow.map((u) => '★'.repeat(u.star)).join(' ، ') : 'لا شيء'} · المتبقي في المخزون المشترك: ${S.match.pool[id]}/${CFG.economy.poolSize[d.tier]}</div>`;
    }
    modal(`<div class="detail-head">${portrait(d, { k: 'md' })}<div><h2>${d.name} ${star ? stars(star) : ''}</h2><div class="hint" style="direction:ltr;text-align:right">${d.en}</div>
      <span class="pill" style="--pc:${W.color}">${W.name}</span><span class="pill">${R.name}</span><span class="pill" style="--pc:var(--t${d.tier})">فئة ${d.tier} · تكلفة ${d.cost}</span>
      <div class="hint">${R.desc} ${d.role === 'assassin' ? 'يقفز للصف الخلفي في بداية القتال.' : ''}</div></div></div>
      <table><tr><th>الخاصية</th><th>★</th><th>★★</th><th>★★★</th></tr>
      ${rows.map(([n, f, dg, suf]) => `<tr><td>${n}</td>${[1, 2, 3].map((s) => { const v = f(s), b = f(1); return `<td>${fmt(v, dg || 0)}${suf || ''}${s > 1 && v !== b ? `<div class="delta">+${Math.round(((v - b) / b) * 100)}%</div>` : ''}</td>`; }).join('')}</tr>`).join('')}</table>
      <div class="skillbox"><b>المهارة — ${sk.name}:</b> ${sk.text}
        ${skRows ? `<table><tr><th></th><th>★</th><th>★★</th><th>★★★</th></tr>${skRows}</table>` : ''}</div>
      <div class="hint"><b>التطوير:</b> ${CFG.stars.copiesPerStar} نسخ ★ = ★★ ، و ${CFG.stars.copiesPerStar} نسخ ★★ = ★★★ (الحد الأقصى). الصحة والهجوم ×${SM[2]} ثم ×${SM[3]}؛ السرعة والمدى ثابتان كي لا تصبح وحدة واحدة غير قابلة للمواجهة.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
        <div><b style="color:${W.color}">${SYNERGIES[d.world].name}</b>${synOf(d.world)}</div>
        <div><b>${SYNERGIES[d.role].name}</b>${synOf(d.role)}</div></div>
      <p class="hint">${W.lore}</p>${match}`);
  }

  function heroDetail(id) {
    const h = HEROES[id], W = WORLDS[h.world];
    modal(`<div class="detail-head">${portrait(h, { k: 'mh' })}<div><h2>${h.name}</h2><div class="hint">${h.title}</div>
      <span class="pill" style="--pc:${W.color}">${W.name}</span><div class="hint">${h.style}</div></div></div>
      <div class="skillbox"><b>سلبية — ${h.passive.name}:</b> ${h.passive.text}</div>
      ${h.abilities.map((a) => `<div class="skillbox"><b>${a.name}</b> — <span style="color:var(--ess)">${a.cost} جوهر</span><br>${a.text}</div>`).join('')}
      <table><tr><th>عند الاستدعاء</th><th></th></tr>
      <tr><td>الصحة</td><td>الحياة × ${CFG.combat.heroHpScale}</td></tr><tr><td>الهجوم</td><td>${h.board.atk} + ${CFG.hero.boardAtkPerRound} لكل جولة</td></tr>
      <tr><td>سرعة الهجوم</td><td>${h.board.as}</td></tr><tr><td>المدى</td><td>${h.board.range}</td></tr><tr><td>الدفاع</td><td>${Math.round(h.board.def * 100)}%</td></tr></table>
      <p class="hint">${W.lore}</p>`);
  }

  function upgradesModal() {
    const m = S.match, p = me();
    const groups = {};
    m.allUnits(p).forEach((u) => { (groups[u.defId] = groups[u.defId] || []).push(u); });
    const need = CFG.stars.copiesPerStar;
    const rows = Object.entries(groups).sort((a, b) => UNITS[b[0]].tier - UNITS[a[0]].tier).map(([id, list]) => {
      const d = UNITS[id];
      const byStar = [1, 2, 3].map((s) => list.filter((u) => u.star === s).length);
      const maxed = byStar[2] > 0 && byStar[0] === 0 && byStar[1] === 0;
      const target = byStar[0] > 0 || byStar[1] === 0 ? 1 : 2;
      const have = byStar[target - 1];
      const SM = CFG.stars.mult;
      const preview = maxed ? 'وصلت للحد الأقصى ★★★' : `عند ${'★'.repeat(target + 1)}: صحة ${fmt(d.hp * SM[target])} → <b>${fmt(d.hp * SM[target + 1])}</b>، هجوم ${fmt(d.atk * SM[target])} → <b>${fmt(d.atk * SM[target + 1])}</b>${d.skill.dmg ? `، ${d.skill.name} ${d.skill.dmg[target - 1]} → <b>${d.skill.dmg[target]}</b>` : d.skill.heal ? `، علاج ${d.skill.heal[target - 1]} → <b>${d.skill.heal[target]}</b>` : d.skill.shield ? `، درع ${d.skill.shield[target - 1]} → <b>${d.skill.shield[target]}</b>` : ''}`;
      const inShop = p.shop.map((x, i) => [x, i]).filter((e) => e[0] === id);
      const btn = inShop.length && !maxed ? `<button class="btn small primary" data-act="buyFromUpg" data-idx="${inShop[0][1]}">شراء من المتجر (${d.cost})</button>` : `<span class="hint">${maxed ? '' : 'غير متوفر في المتجر الآن'}</span>`;
      return `<div class="upg-row">${portrait(d, { k: 'up' + id })}<div><b>${d.name}</b> <span class="hint">★×${byStar[0]} ★★×${byStar[1]} ★★★×${byStar[2]} · المخزون ${m.pool[id]}</span>
        ${maxed ? '' : `<div class="hint">نسخ ${'★'.repeat(target)}: ${have}/${need} للترقية</div><div class="prog"><i style="width:${(have / need) * 100}%"></i></div>`}
        <div class="hint">${preview}</div></div>${btn}</div>`;
    }).join('');
    modal(`<h2>شاشة التطوير</h2><p class="hint">اجمع ${need} نسخ متطابقة بنفس عدد النجوم ليتم دمجها تلقائيًا في وحدة أقوى (تنتقل المعدات معها). الحد الأقصى ★★★.
      المخزون مشترك بين اللاعبين، فإذا جمع خصمك نفس الوحدة تصبح أصعب.</p>${rows || '<p class="hint">لا تملك وحدات بعد.</p>'}`);
  }

  function howto() {
    modal(`<h2>كيف ألعب؟</h2>
      <div class="skillbox"><b>الهدف:</b> أوصل حياة بطل الخصم إلى الصفر. كل جولة: موارد ← شراء وتطوير ← ترتيب وقدرات ← قتال تلقائي ← نتائج.</div>
      <div class="skillbox"><b>المتجر:</b> اشترِ الوحدات بالذهب، حدّث العروض (${CFG.economy.rerollCost} ذهب)، اشترِ خبرة لرفع المستوى (= عدد الوحدات في الساحة). الفائدة: +1 لكل ${CFG.economy.interestPer} ذهب مدخر (حتى ${CFG.economy.interestMax}). سلاسل الفوز/الخسارة تمنح ذهبًا إضافيًا.</div>
      <div class="skillbox"><b>التطوير:</b> ${CFG.stars.copiesPerStar} نسخ متطابقة = نجمة إضافية تلقائيًا.</div>
      <div class="skillbox"><b>الساحة:</b> صف أمامي (خط الدفاع) وصف خلفي. الحراس والمقاتلون في الأمام، السحرة والقناصة والدعم في الخلف. القتلة يقفزون إلى الصف الخلفي للعدو.</div>
      <div class="skillbox"><b>البطل:</b> يبقى في مركز القيادة ولا يمكن استهدافه ما دام لديك وحدة حية في الصف الأمامي. إذا سقط خط الدفاع يصبح مكشوفًا. يمكنك استدعاؤه للساحة ليقاتل بنفسه — مكسب كبير ومخاطرة حقيقية.</div>
      <div class="skillbox"><b>القدرات:</b> جهّز قدرات البطل واختر متى تُفعّل (بداية القتال، بعد 5 ثوانٍ، عند سقوط أول حليف، عند انكشاف البطل). تستهلك الجوهر.</div>
      <div class="skillbox"><b>التآزر:</b> وحدات من نفس العالم أو الدور تفعّل مكافآت. وحدات عالم بطلك تكتسب رنينًا. وجود 3–4 عوالم مختلفة يفعّل "تقارب العوالم" فلا تكون التشكيلات المختلطة أضعف.</div>
      <div class="skillbox"><b>إنهاء المباريات الطويلة:</b> بعد ${CFG.combat.furyStart} ثانية من القتال يتصاعد الضرر (الغضب). من الجولة ${CFG.match.collapseStartRound} يخسر البطلان حياة إضافية كل جولة (انهيار الصدع). الحد الأقصى ${CFG.match.maxRounds} جولة.</div>`);
  }

  function matchMenu() {
    const wasPaused = S.paused;
    S.paused = true; S.pausedLeft = S.deadline - Date.now();
    S._resumeAfterMenu = !wasPaused;
    modal(`<h2>القائمة</h2><div style="display:grid;gap:10px;margin-top:12px">
      <button class="btn" data-act="resumeMenu">متابعة</button>
      <button class="btn" data-act="howto">كيف ألعب؟</button>
      <button class="btn danger" data-act="surrender">استسلام (${esc(me().name)})</button>
      <button class="btn ghost" data-act="abandon">خروج للقائمة الرئيسية (لا تُسجَّل)</button></div>`);
  }

  // ======================================================================= results / stats / codex
  function showResults() {
    const m = S.match;
    closeOverlay();
    cancelAnimationFrame(S.raf);
    S.phase = 'over';
    const secs = Math.round((Date.now() - S.startTs) / 1000);
    if (S.mode !== 'friendly' && !m._recorded) { AMB.telemetry.recordMatch(m, { seconds: secs }); m._recorded = true; }
    let title;
    if (m.winner === null || m.winner === undefined) title = 'تعادل';
    else if (S.mode === 'hotseat') title = `فاز ${esc(m.players[m.winner].name)}!`;
    else title = m.winner === 0 ? 'نصر!' : 'هزيمة';
    const last = m.history[m.history.length - 1];
    const cols = m.players.map((p, i) => {
      const h = HEROES[p.heroId];
      const b = last ? last.players[i].board : [];
      const syn = last ? last.players[i].synergies.map((s) => SYNERGIES[s].name).join('، ') : '';
      return `<div class="res-col ${m.winner === i ? 'won' : ''}"><div class="hero-box">${portrait(h, { k: 'res' + i })}<div><div class="nm">${esc(p.name)} ${m.winner === i ? '🏆' : ''}</div><div class="ti">${h.name} · ${WORLDS[h.world].name}${p.isAI ? ' · ذكاء اصطناعي (' + p.aiStyle + ')' : ''}</div></div></div>
        <div class="kv"><span>الحياة المتبقية</span><b>${lifeStr(p.life)}</b></div>
        <div class="kv"><span>جولات فاز/خسر/تعادل</span><b>${p.stats.wins}/${p.stats.losses}/${p.stats.draws}</b></div>
        <div class="kv"><span>الضرر الكلي للوحدات</span><b>${fmt(p.stats.damageDealt)}</b></div>
        <div class="kv"><span>الذهب المنفق</span><b>${p.stats.goldSpent}</b></div>
        <div class="kv"><span>الوحدات المشتراة / التحديثات</span><b>${p.stats.unitsBought} / ${p.stats.rerolls}</b></div>
        <div class="kv"><span>المستوى النهائي</span><b>${p.level}</b></div>
        <div class="hint" style="margin-top:6px">التآزر النهائي: ${syn || '—'}</div>
        <div class="mini-board">${b.map((u, k) => `<div class="mini">${portrait(UNITS[u.defId], { k: 'rb' + i + k })}<div>${stars(u.star)}</div></div>`).join('')}</div></div>`;
    }).join('');
    const tl = m.history.map((r) => `<span class="${r.winner === null ? 'wd' : r.winner === 0 ? 'w0' : 'w1'}">${r.round}</span>`).join('');
    $('results').innerHTML = `<div class="res-banner"><h1>${title}</h1><p class="hint">${m.round} جولات · ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')} دقيقة ${S.mode === 'friendly' ? '· مباراة ودية (لم تُسجَّل)' : ''}</p>
      <div class="timeline">${tl}</div><p class="hint">أخضر = فوز ${esc(m.players[0].name)} · أحمر = فوز ${esc(m.players[1].name)}</p></div>
      <div class="res-cols">${cols}</div>
      <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:30px">
        <button class="btn primary big" data-act="again">مباراة جديدة</button>
        <button class="btn big" data-act="go" data-to="stats">الإحصائيات</button>
        <button class="btn big ghost" data-act="go" data-to="menu">القائمة الرئيسية</button></div>`;
    show('results');
  }

  function renderStats() {
    const d = AMB.telemetry.load();
    const pct = (w, p) => (p ? Math.round(((w || 0) / p) * 100) : 0);
    const tbl = (obj, nameOf, extra) => {
      const rows = Object.entries(obj).sort((a, b) => b[1].picks - a[1].picks);
      if (!rows.length) return '<p class="hint">لا توجد بيانات بعد — العب مباراة.</p>';
      return `<table><tr><th>الاسم</th><th>مرات</th><th>نسبة الفوز</th><th></th>${extra ? '<th>نهائي</th><th>★★★</th>' : ''}</tr>${rows.map(([k, v]) =>
        `<tr><td>${nameOf(k)}</td><td>${v.picks}</td><td>${pct(v.wins, v.picks)}%</td><td><div class="bar"><i style="width:${pct(v.wins, v.picks)}%"></i></div></td>${extra ? `<td>${v.final || 0}</td><td>${v.threeStar || 0}</td>` : ''}</tr>`).join('')}</table>`;
    };
    const recent = d.recent.map((r) => `<tr><td>${new Date(r.at).toLocaleString('ar')}</td><td>${r.mode}</td><td>${r.heroes.map((h) => HEROES[h] ? HEROES[h].name : h).join(' ضد ')}</td><td>${r.winner === null ? 'تعادل' : 'لاعب ' + (r.winner + 1)}</td><td>${r.rounds}</td><td>${Math.round(r.seconds / 60 * 10) / 10}د</td></tr>`).join('');
    $('stats').innerHTML = `
      <div class="box"><h3>نظرة عامة</h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center">
          <div><div class="big-num">${d.matches}</div><div class="hint">مباراة</div></div>
          <div><div class="big-num">${d.matches ? fmt(d.totalRounds / d.matches, 1) : 0}</div><div class="hint">متوسط الجولات</div></div>
          <div><div class="big-num">${d.matches ? fmt(d.totalSeconds / d.matches / 60, 1) : 0}</div><div class="hint">متوسط الدقائق</div></div></div>
        <p class="hint">تعادلات: ${d.draws} · استدعاء البطل: ${d.summons.used} لاعب، فوز ${pct(d.summons.wins, d.summons.used)}%</p>
        <p class="hint">لاختبار التوازن على نطاق واسع شغّل محاكي الذكاء الاصطناعي: <code>node tools/simulate.js 800</code></p>
        <div style="display:flex;gap:8px"><button class="btn small" data-act="statsExport">تصدير JSON</button><button class="btn small danger" data-act="statsReset">مسح البيانات</button></div></div>
      <div class="box"><h3>الأبطال</h3>${tbl(d.heroes, (k) => HEROES[k] ? HEROES[k].name : k)}</div>
      <div class="box"><h3>أنماط اللاعبين</h3>${tbl(d.styles, (k) => k === 'human' ? 'بشري' : k.replace('ai:', 'ذكاء اصطناعي: '))}</div>
      <div class="box"><h3>التآزر</h3>${tbl(d.synergies, (k) => SYNERGIES[k] ? SYNERGIES[k].name : k)}</div>
      <div class="box" style="grid-column:1/-1"><h3>الوحدات (استخدام ونسبة فوز)</h3>${tbl(d.units, (k) => UNITS[k] ? UNITS[k].name : k, true)}</div>
      <div class="box" style="grid-column:1/-1"><h3>آخر المباريات</h3>${recent ? `<table><tr><th>الوقت</th><th>النمط</th><th>الأبطال</th><th>الفائز</th><th>جولات</th><th>المدة</th></tr>${recent}</table>` : '<p class="hint">—</p>'}</div>`;
  }

  function renderCodex() {
    const f = S.codexF;
    const fb = (kind, id, name) => `<button class="btn small ${f[kind] === id ? 'on' : ''}" data-act="codexF" data-k="${kind}" data-v="${id}">${name}</button>`;
    const units = Object.values(UNITS).filter((u) => (!f.world || u.world === f.world) && (!f.role || u.role === f.role)).sort((a, b) => a.tier - b.tier);
    $('codex').innerHTML = `
      <h3>الأبطال</h3>
      <div class="codex-grid">${Object.values(HEROES).map((h) => `<div class="card" data-act="heroInfo" data-id="${h.id}" style="--tc:${WORLDS[h.world].color}">${portrait(h, { k: 'cx' })}<div class="cn">${h.name}</div><div class="cm">${h.title}</div></div>`).join('')}</div>
      <h3>الوحدات (${units.length})</h3>
      <div class="filters">${fb('world', '', 'كل العوالم')}${Object.values(WORLDS).map((w) => fb('world', w.id, w.name)).join('')}</div>
      <div class="filters">${fb('role', '', 'كل الأدوار')}${Object.values(ROLES).map((r) => fb('role', r.id, r.name)).join('')}</div>
      <div class="codex-grid">${units.map((d) => `<div class="card" style="--tc:var(--t${d.tier})" data-act="detail" data-id="${d.id}"><span class="cost">${icon('gold')}${d.cost}</span>${portrait(d, { k: 'cu' })}
        <div class="cn">${d.name}</div><div class="cm" style="color:${WORLDS[d.world].color}">${WORLDS[d.world].name}</div><div class="cm">${ROLES[d.role].name} · ${d.skill.name}</div></div>`).join('')}</div>
      <h3>المعدات والتعاويذ</h3>
      <div class="codex-grid">${Object.values(ITEMS).map((it) => `<div class="card ${it.kind}"><span class="cost">${icon('gold')}${it.cost}</span>${icon(it.icon, 'big-ic')}<div class="cn">${it.name}</div><div class="cm">${it.kind === 'equip' ? 'معدة' : 'تعويذة'}</div><div class="cm">${it.text}</div></div>`).join('')}</div>`;
  }

  // ======================================================================= input
  function clickSlot(slot) {
    const m = S.match, p = me(), v = S.v;
    const occ = p.board[slot];
    const heroHere = p.summoned && p.heroSlot === slot;
    const sel = S.sel;
    if (sel && sel.kind === 'item') {
      if (occ && res(m.equip(v, sel.idx, occ.uid))) { toast('تم التجهيز', 'good'); S.sel = null; }
      else if (!occ) toast('اختر وحدة لتجهيزها', 'err');
    } else if (sel && sel.kind === 'unit') {
      if (occ && occ.uid === sel.uid) S.sel = null;
      else if (res(m.move(v, sel.uid, { zone: 'board', slot }))) S.sel = null;
    } else if (sel && sel.kind === 'hero') {
      if (!heroHere) res(m.moveHero(v, slot));
      S.sel = null;
    } else if (occ) S.sel = { kind: 'unit', uid: occ.uid };
    else if (heroHere) S.sel = { kind: 'hero' };
    renderMatch();
  }

  function clickBench(idx) {
    const m = S.match, p = me(), v = S.v;
    const occ = p.bench[idx];
    const sel = S.sel;
    if (sel && sel.kind === 'item') {
      if (occ && res(m.equip(v, sel.idx, occ.uid))) { toast('تم التجهيز', 'good'); S.sel = null; }
    } else if (sel && sel.kind === 'unit') {
      if (occ && occ.uid === sel.uid) S.sel = null;
      else if (res(m.move(v, sel.uid, { zone: 'bench', idx }))) S.sel = null;
    } else if (sel && sel.kind === 'hero') {
      toast('لإعادة البطل استخدم زر "إعادة البطل إلى مركز القيادة"', 'err'); S.sel = null;
    } else if (occ) S.sel = { kind: 'unit', uid: occ.uid };
    renderMatch();
  }

  const prepActive = () => S.screen === 'match' && (S.phase === 'prep' || S.phase === 'resources');

  const ACT = {
    go: (d) => { show(d.to); if (d.to === 'stats') renderStats(); if (d.to === 'codex') renderCodex(); },
    howto: () => howto(),
    diff: (d) => { S.difficulty = d.v; document.querySelectorAll('#diff-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === d.v)); },
    mode: (d) => { S.mode = d.v; S.picks = [null, null]; S.pickIdx = 0; renderHeroSelect(); show('hero'); },
    pickHero: (d, el, e) => { if (e.target.closest('[data-act="heroInfo"]')) return; S.picks[S.pickIdx] = d.id; renderHeroSelect(); },
    heroInfo: (d, el, e) => { e.stopPropagation(); heroDetail(d.id); },
    heroConfirm: () => {
      if (!S.picks[S.pickIdx]) return;
      if (S.mode === 'hotseat' && S.pickIdx === 0) { S.pickIdx = 1; renderHeroSelect(); return; }
      startMatch();
    },
    handoffGo: (d) => beginPrep(+d.pi),
    slot: (d) => prepActive() && clickSlot(d.slot),
    bench: (d) => prepActive() && clickBench(+d.idx),
    buy: (d, el, e) => {
      if (!prepActive() || e.target.closest('[data-act="detail"]')) return;
      const r = S.match.buy(S.v, +d.idx);
      if (res(r) && r.merged && r.merged.length) r.merged.forEach((u) => toast(`تطوير! ${UNITS[u.defId].name} ${'★'.repeat(u.star)}`, 'good'));
      renderMatch();
    },
    buyFromUpg: (d) => { const r = S.match.buy(S.v, +d.idx); if (res(r) && r.merged && r.merged.length) toast(`تطوير! ${UNITS[r.merged[r.merged.length - 1].defId].name} ${'★'.repeat(r.merged[r.merged.length - 1].star)}`, 'good'); renderMatch(); upgradesModal(); },
    buyItem: (d) => { if (prepActive() && res(S.match.buyItem(S.v, +d.idx))) renderMatch(); },
    reroll: () => { if (prepActive() && res(S.match.reroll(S.v))) renderMatch(); },
    xp: () => { if (prepActive()) { const lv = me().level; if (res(S.match.buyXp(S.v))) { if (me().level > lv) toast(`المستوى ${me().level}! يمكنك وضع ${me().level} وحدات`, 'good'); renderMatch(); } } },
    lock: () => { if (prepActive()) { S.match.toggleLock(S.v); renderMatch(); } },
    ready: () => prepActive() && endPrep(),
    sell: () => { if (prepActive() && S.sel && S.sel.kind === 'unit' && res(S.match.sell(S.v, S.sel.uid))) { S.sel = null; renderMatch(); } },
    unequip: () => { if (S.sel && S.sel.kind === 'unit' && res(S.match.unequip(S.v, S.sel.uid))) renderMatch(); },
    bagSel: (d) => { if (!prepActive()) return; const i = +d.idx; S.sel = S.sel && S.sel.kind === 'item' && S.sel.idx === i ? null : { kind: 'item', idx: i }; renderMatch(); },
    arm: () => { if (S.sel && S.sel.kind === 'item' && res(S.match.armSpell(S.v, S.sel.idx))) { S.sel = null; toast('جُهّزت التعويذة للقتال القادم', 'good'); renderMatch(); } },
    disarm: (d) => { if (prepActive() && res(S.match.disarmSpell(S.v, +d.idx))) renderMatch(); },
    sellItem: () => { if (S.sel && S.sel.kind === 'item' && res(S.match.sellItem(S.v, S.sel.idx))) { S.sel = null; renderMatch(); } },
    summon: () => { if (prepActive() && res(S.match.toggleSummon(S.v))) { S.sel = null; toast(me().summoned ? 'استُدعي البطل إلى الساحة' : 'عاد البطل إلى مركز القيادة', 'good'); renderMatch(); } },
    detail: (d, el, e) => { e.stopPropagation(); unitDetail(d.id, d.star ? +d.star : 0); },
    upgrades: () => upgradesModal(),
    closeModal: () => { closeModal(); if (S._resumeAfterMenu) { ACT.resumeMenu(); } },
    pause: () => {
      if (S.phase === 'prep') {
        if (!S.paused) { S.paused = true; S.pausedLeft = S.deadline - Date.now(); }
        else { S.paused = false; S.deadline = Date.now() + S.pausedLeft; }
      } else if (S.phase === 'combat') S.paused = !S.paused;
      renderTop();
    },
    menuMatch: () => matchMenu(),
    resumeMenu: () => {
      closeModal();
      if (S._resumeAfterMenu) { S.paused = false; if (S.phase === 'prep') S.deadline = Date.now() + S.pausedLeft; }
      S._resumeAfterMenu = false;
      renderTop();
    },
    surrender: () => {
      const m = S.match;
      closeModal(); S._resumeAfterMenu = false; S.paused = false;
      cancelAnimationFrame(S.raf);
      m.winner = 1 - S.v; m.phase = 'over'; m.endedAt = Date.now();
      me().life = 0;
      showResults();
    },
    abandon: () => { closeModal(); closeOverlay(); S._resumeAfterMenu = false; S.paused = false; cancelAnimationFrame(S.raf); S.phase = 'idle'; S.match = null; show('menu'); },
    speed: (d) => { S.speed = +d.v; renderCombatCtrl(); },
    skip: () => skipCombat(),
    nextRound: () => { closeOverlay(); if (S.match.isOver) showResults(); else nextRound(); },
    toResults: () => showResults(),
    again: () => { S.picks = [S.picks[0], S.picks[1]]; S.pickIdx = 0; renderHeroSelect(); show('hero'); },
    statsExport: () => {
      const blob = new Blob([JSON.stringify(AMB.telemetry.load(), null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'multiverse-telemetry.json'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    statsReset: () => { if (confirm('مسح جميع الإحصائيات؟')) { AMB.telemetry.reset(); renderStats(); } },
    codexF: (d) => { S.codexF[d.k] = d.v; renderCodex(); },
  };

  document.addEventListener('click', (e) => {
    if (e.target === $('modal-back')) { ACT.closeModal(); return; }
    const el = e.target.closest('[data-act]');
    if (!el) { if (S.sel && S.screen === 'match' && !e.target.closest('.panel,.shopbar,.field,.bench-row,.modal')) { S.sel = null; renderMatch(); } return; }
    const fn = ACT[el.dataset.act];
    if (fn) fn(el.dataset, el, e);
  });
  document.addEventListener('change', (e) => {
    const sel = e.target.closest('select[data-ab]');
    if (sel && prepActive()) { res(S.match.setAbility(S.v, sel.dataset.ab, sel.value || null)); renderMatch(); }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if ($('modal-back').classList.contains('on')) ACT.closeModal(); else if (S.sel) { S.sel = null; if (S.match) renderMatch(); } return; }
    if (!prepActive() || $('modal-back').classList.contains('on') || $('overlay').classList.contains('on')) return;
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    const k = e.key.toLowerCase();
    if (k === 'd') ACT.reroll();
    else if (k === 'f') ACT.xp();
    else if (k === 'e') ACT.sell();
    else if (e.key === 'Enter') { e.preventDefault(); ACT.ready(); }
  });

  // drag & drop (desktop); click-to-move works everywhere
  document.addEventListener('dragstart', (e) => {
    const el = e.target.closest('[data-drag]');
    if (!el || !prepActive()) { e.preventDefault(); return; }
    const v = el.dataset.drag;
    S.sel = v === 'hero' ? { kind: 'hero' } : { kind: 'unit', uid: v.slice(5) };
    e.dataTransfer.setData('text/plain', v);
    e.dataTransfer.effectAllowed = 'move';
  });
  document.addEventListener('dragover', (e) => {
    const t = e.target.closest('[data-drop], .shopbar');
    if (t && prepActive()) { e.preventDefault(); t.classList.add('drop'); }
  });
  document.addEventListener('dragleave', (e) => { const t = e.target.closest('[data-drop], .shopbar'); if (t) t.classList.remove('drop'); });
  document.addEventListener('drop', (e) => {
    const t = e.target.closest('[data-drop], .shopbar');
    if (!t || !prepActive()) return;
    e.preventDefault();
    t.classList.remove('drop');
    if (t.classList.contains('shopbar')) { if (S.sel && S.sel.kind === 'unit') ACT.sell(); return; }
    const [zone, key] = t.dataset.drop.split(':');
    if (zone === 'board') clickSlot(key); else clickBench(+key);
  });

  // debug / testing hook
  globalThis.AMB_UI = { S, ACT, renderMatch };
})();
