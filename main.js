import { buildShift, newRun, quote, commit, SHIFTS, W, H, RIVER, BRIDGES, REST, HOMES, REST_NAMES } from './engine/sim.js';
import { runAlgo, traceAlgo } from './engine/algo.js';
import { average, verdict, lateCount, losses, LATE } from './engine/score.js';
import { vizHtml, CONCEPTS } from './viz.js';
import { algoIndex, renderLab, stopLabs, LABS } from './labs.js';

const $ = (id) => document.getElementById(id), app = $('app');
const qs = new URLSearchParams(location.search);
const beat = Number(qs.get('beat')) / 10 || null;
const MS = 900, S = 36, IDS = ['A', 'B', 'C', 'D'];
const mem = {};
const store = {
  get(k) { try { const v = localStorage.getItem(k); return v === null ? mem[k] ?? null : v; } catch { return mem[k] ?? null; } },
  set(k, v) { mem[k] = v; try { localStorage.setItem(k, v); } catch {} },
};

let token = 0, game = null, demo = false;
const idx = (list, p) => list.indexOf(p);
const placeText = (o) => `${REST_NAMES[idx(REST, o.rest)]} to Home ${idx(HOMES, o.home) + 1}`;

/* ---------- router ---------- */
function route() {
  token++; game = null; stopLabs();
  const [, page, arg] = (location.hash || '#/home').split('/');
  demo = page === 'demo';
  if (qs.get('test') === '1' || page === 'tests') return runTests();
  if ((page === 'play' || page === 'demo') && SHIFTS[arg]) return play(arg);
  if (page === 'algo') return LABS.some((l) => l[0] === arg) ? renderLab(app, arg) : (app.innerHTML = algoIndex());
  if (page === 'learn') return learn();
  home();
}
function home() {
  const cards = Object.entries(SHIFTS).map(([k, s]) => {
    const b = store.get('best:' + k);
    return `<a class="card" href="#/play/${k}"><h3>${s.name}</h3><p>${s.count} orders, ${s.open.length} open bridge${s.open.length > 1 ? 's' : ''}</p><p class="meta">${b ? 'Your best: ' + (b / 10).toFixed(1) + ' min' : 'Not played yet'}</p></a>`;
  }).join('');
  const extra = `<a class="card" href="#/demo/lunch"><h3>Watch the algorithm play</h3><p>The dispatcher runs a shift by itself.</p></a><a class="card" href="#/algo"><h3>Algorithms</h3><p>Try priority queue, BFS, greedy and queue on real problems.</p></a><a class="card" href="#/learn"><h3>Architecture</h3><p>How this project is organised.</p></a><a class="card" href="#/tests"><h3>Run checks</h3><p>See every automatic check pass in your browser.</p></a>`;
  app.innerHTML = `<h2>Dispatch the orders. Beat the algorithm.</h2>
    ${beat ? `<p class="verdict close">Challenge: beat an average of ${beat.toFixed(1)} min.</p>` : ''}
    <p>Orders arrive while the clock runs. Send each one to the rider who can deliver it soonest, then open Inspect algorithm to see how the dispatcher decided. Or try each algorithm on its own real-world problem under Algorithms.</p><div class="cards">${cards}</div><h2>Explore</h2><div class="cards">${extra}</div>`;
}

/* ---------- architecture explorer ---------- */
const STAGES = {
  Engine: { dir: 'js/engine/', in: 'Grid, orders and riders', out: 'Queue, heap, BFS, simulation, dispatch and scoring, all pure functions', step: 2 },
  City: { dir: 'js/main.js (drawCity)', in: 'A shift, the current order and rider positions', out: 'An SVG city with bridges, restaurants, homes, scooters and routes', step: 3 },
  Game: { dir: 'js/main.js (play)', in: 'The clock, your rider choices and key presses', out: 'Live dispatch, pause and resume, and a finished shift', step: 4 },
  Race: { dir: 'js/engine/score.js', in: "Your delivery times and the algorithm's", out: 'Averages, a verdict and your three biggest losses', step: 5 },
  Think: { dir: 'js/viz.js', in: 'Waiting orders, BFS distances and rider quotes', out: 'Four visualizers: heap, wavefront, greedy bars and queue slots', step: 6 },
};
function learn() {
  app.innerHTML = `<h2>Architecture explorer</h2><div class="explorer"><p class="meta">Select a stage to see what goes in and what comes out.</p>
    <div class="pillbar">${Object.keys(STAGES).map((s) => `<button data-s="${s}">${s}</button>`).join('')}</div><div id="stage" class="stage"></div></div>`;
  const stage = (s) => {
    const d = STAGES[s];
    document.querySelectorAll('[data-s]').forEach((b) => b.classList.toggle('on', b.dataset.s === s));
    $('stage').innerHTML = `<h3>${d.dir}</h3><p><b class="lab">Takes in:</b> ${d.in}</p><p><b class="lab">Gives out:</b> ${d.out}</p><span class="chip">Built in Step ${d.step}</span>`;
  };
  document.querySelectorAll('[data-s]').forEach((b) => (b.onclick = () => stage(b.dataset.s)));
  stage('Engine');
}

/* ---------- city drawing ---------- */
function drawCity(shift, o, riderPos, route) {
  let s = `<svg viewBox="0 0 ${W * S} ${H * S}" role="img" aria-label="City grid">`;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const px = x * S, py = y * S; let fill = 'var(--cell)';
    if (x === RIVER) fill = shift.open.includes(y) ? 'var(--bridge)' : 'var(--river)';
    else if (shift.blocked.has(x + ',' + y)) fill = 'var(--block)';
    s += `<rect x="${px}" y="${py}" width="${S}" height="${S}" fill="${fill}" stroke="var(--line)"/>`;
    if (x === RIVER && BRIDGES.includes(y) && !shift.open.includes(y))
      s += `<text x="${px + 18}" y="${py + 24}" text-anchor="middle" fill="var(--bad)" font-size="20">✕</text>`;
  }
  if (route && route.length) s += `<polyline points="${route.map((p) => `${p[0] * S + 18},${p[1] * S + 18}`).join(' ')}" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".75"/>`;
  const tag = (p, label, cls, hot) =>
    `<g class="${cls}${hot ? ' hot' : ''}"><rect x="${p[0] * S + 4}" y="${p[1] * S + 4}" width="${S - 8}" height="${S - 8}" rx="${cls === 'h' ? 14 : 4}"/><text x="${p[0] * S + 18}" y="${p[1] * S + 23}" text-anchor="middle">${label}</text></g>`;
  REST.forEach((p, n) => (s += tag(p, 'R' + (n + 1), 'r', o && o.rest === p)));
  HOMES.forEach((p, n) => (s += tag(p, 'H' + (n + 1), 'h', o && o.home === p)));
  riderPos.forEach((p, m) => (s += `<g class="rider" id="rd${IDS[m]}" transform="translate(${p[0] * S + 18} ${p[1] * S + 18})"><circle r="11"/><text y="4" text-anchor="middle">${IDS[m]}</text></g>`));
  return s + '</svg>';
}
const lerp = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
function riderXY(r, c) {
  for (const j of r.jobs) if (c < j.finish) {
    if (c < j.start) return j.from;
    if (c < j.start + j.d1) return lerp(j.from, j.rest, (c - j.start) / j.d1);
    return lerp(j.rest, j.home, (c - j.start - j.d1) / ((j.finish - j.start - j.d1) || 1));
  }
  return r.pos;
}

/* ---------- play + inspect ---------- */
function play(k) {
  const tk = token, shift = buildShift(k), n = shift.orders.length, trace = traceAlgo(shift), algo = { times: trace.times };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let run = newRun(), i = 0, mine = [], clock = shift.orders[0].t, paused = false, hint = false, last = performance.now(), lastDemo = 0, saved = false;
  let mode = 'play', di = 0, concept = 'pq', st = null;
  const drops = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.8 }));

  app.innerHTML = `<div class="game"><section id="panel"></section><section id="cityWrap"><div id="city"></div><canvas id="rain"></canvas></section></div>
    <h2 id="vizh">How the algorithm thinks</h2><section id="viz" class="vizgrid"></section>
    <p class="meta">R restaurant, H home, A–D riders, ✕ closed bridge. One grid step is one minute. Space pauses, arrow keys step through decisions.</p>`;

  const head = () => `<p class="lbl">Mode</p><div class="pillbar">${[['play', 'Play'], ['inspect', 'Inspect algorithm']].map(([m, t]) => `<button data-mode="${m}" class="${mode === m ? 'on' : ''}">${t}</button>`).join('')}</div>
    <p class="lbl">Shift</p><div class="pillbar">${Object.entries(SHIFTS).map(([id, s]) => `<a class="${id === k ? 'on' : ''}" href="#/play/${id}">${s.name}</a>`).join('')}</div>
    ${beat ? `<p class="meta">Challenge: beat ${beat.toFixed(1)} min average</p>` : ''}`;

  const panel = () => {
    if (mode === 'inspect') {
      const o = st.order, who = st.riders[st.pick];
      return head() + `<div class="stepper"><button id="prev" ${di ? '' : 'disabled'}>Previous</button><span>Decision ${di + 1} of ${n}</span><button id="next" ${di < n - 1 ? '' : 'disabled'}>Next</button></div>
        <div class="ocard"><p><b>Order ${o.label}</b> at minute ${o.t}</p><p>${placeText(o)}, due minute ${o.due}</p><p class="assigned">Assigned to ${who.name}</p><p class="meta">Delivered in ${st.quotes[st.pick].time} min</p></div>
        <p class="lbl">Concept</p><div class="pillbar wrap">${CONCEPTS.map(([c, t]) => `<button data-c="${c}" class="${concept === c ? 'on' : ''}">${t}</button>`).join('')}</div><div id="concept"></div><p><a href="#/algo/${concept === 'fifo' ? 'queue' : concept}">Try it on a real problem →</a></p>`;
    }
    if (i < n) {
      const o = shift.orders[i];
      const btns = run.riders.map((r, m) => `<button class="rb" data-r="${m}" ${paused ? 'disabled' : ''}>${m + 1}. ${r.name}<small>${hint ? quote(shift, r, o, clock).time + ' min' : 'free at ' + Math.max(0, Math.round(r.free))}</small></button>`).join('');
      return head() + `<div class="ocard"><p class="meta">Clock <b id="clk">${Math.floor(clock)}</b> min · Order ${i + 1} of ${n} · <span id="pend">0</span> waiting</p>
        <p><b>Order ${o.label}</b> at minute ${o.t}</p><p>${placeText(o)}, due minute ${o.due}</p></div>
        <div class="riders">${btns}</div><label><input type="checkbox" id="hint" ${hint ? 'checked' : ''}/> Show delivery time per rider</label>
        <div class="row"><button id="pause">${paused ? 'Resume' : 'Pause'}</button><button id="restart">Restart</button></div>`;
    }
    const you = average(mine), al = average(algo.times), v = verdict(you, al), best = store.get('best:' + k);
    const words = { win: 'You win. Your average is lower.', close: 'Close. Within 10% of the algorithm.', behind: 'Behind. The algorithm is more than 10% faster.' };
    const ls = losses(mine, algo.times).map((l) => `<li>${shift.orders[l.id].label}: +${l.diff} min slower</li>`).join('') || '<li>None. You matched or beat it on every order.</li>';
    const link = `${location.origin}${location.pathname}?shift=${k}&beat=${Math.round(you * 10)}#/play/${k}`;
    const chal = beat ? `<p>${you < beat ? 'You beat' : 'You missed'} the challenge of ${beat.toFixed(1)} min.</p>` : '';
    return head() + `<div class="ocard"><h3>Shift complete</h3><p>You: ${you.toFixed(1)} min · Algorithm: ${al.toFixed(1)} min</p><p class="verdict ${v}">${words[v]}</p>${chal}
      <p>Late (over ${LATE} min): you ${lateCount(mine)}, algorithm ${lateCount(algo.times)}${best ? ' · Your best: ' + (best / 10).toFixed(1) + ' min' : ''}</p>
      <h3>Your three biggest losses</h3><ul>${ls}</ul><p class="meta">Challenge link</p><input class="link" readonly value="${link}"/>
      <div class="row"><button id="restart">Play again</button></div></div>`;
  };
  const draw = () => {
    let pos, route = null, o = null;
    if (mode === 'inspect') {
      st = trace.steps[di]; o = st.order; pos = st.riders.map((r) => r.pos);
      const from = st.riders[st.pick].pos;
      route = [...shift.path(from, o.rest), ...shift.path(o.rest, o.home).slice(1)];
    } else { pos = run.riders.map((r) => riderXY(r, clock)); o = i < n ? shift.orders[i] : null; }
    $('city').innerHTML = drawCity(shift, o, pos, route);
    $('panel').innerHTML = panel();
    $('vizh').hidden = mode === 'inspect';
    $('viz').innerHTML = mode === 'inspect' ? '' : vizHtml(shift, run, i);
    if (mode === 'inspect') $('concept').innerHTML = vizHtml(shift, { riders: st.riders }, di, concept);
    document.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { mode = b.dataset.mode; if (mode === 'inspect') paused = true; draw(); }));
    document.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => { concept = b.dataset.c; draw(); }));
    document.querySelectorAll('.rb').forEach((b) => (b.onclick = () => assign(+b.dataset.r)));
    $('prev') && ($('prev').onclick = () => step(-1));
    $('next') && ($('next').onclick = () => step(1));
    $('pause') && ($('pause').onclick = togglePause);
    $('restart') && ($('restart').onclick = route);
    $('hint') && ($('hint').onchange = (e) => { hint = e.target.checked; draw(); });
  };
  const step = (d) => { di = Math.max(0, Math.min(n - 1, di + d)); draw(); };
  const assign = (ri) => {
    if (mode !== 'play' || i >= n || paused) return;
    mine.push(commit(shift, run, ri, shift.orders[i], clock)); i++;
    if (i < n && clock < shift.orders[i].t) clock = shift.orders[i].t;
    if (i >= n && !saved) { saved = true; const t = Math.round(average(mine) * 10), b = Number(store.get('best:' + k)); if (!b || t < b) store.set('best:' + k, t); }
    draw();
  };
  const togglePause = () => { if (i < n) { paused = !paused; draw(); } };
  game = {
    key(e) {
      if (mode === 'inspect') { if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1); return; }
      if (e.key === ' ') { e.preventDefault(); togglePause(); } else if ('1234'.includes(e.key)) assign(+e.key - 1);
    },
  };

  const frame = (now) => {
    if (tk !== token) return;
    const dt = now - last; last = now;
    if (mode === 'play') {
      const busy = Math.max(...run.riders.map((r) => r.free));
      if (!paused && (i < n || clock < busy)) clock += dt / MS;
      if (i < n && $('clk')) { $('clk').textContent = Math.floor(clock); $('pend').textContent = shift.orders.filter((o, x) => x > i && o.t <= clock).length; }
      run.riders.forEach((r, m) => { const el = $('rd' + IDS[m]), p = riderXY(r, clock); el && el.setAttribute('transform', `translate(${p[0] * S + 18} ${p[1] * S + 18})`); });
      if ((demo || qs.get('demo') === '1') && i < n && !paused && now - lastDemo > 500) {
        lastDemo = now; const o = shift.orders[i]; let b = 0;
        run.riders.forEach((r, m) => { if (quote(shift, r, o, clock).finish < quote(shift, run.riders[b], o, clock).finish) b = m; });
        assign(b);
      }
    }
    const cv = $('rain');
    if (cv) {
      const ctx = cv.getContext('2d'), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      ctx.clearRect(0, 0, w, h);
      if (k === 'rain' && !reduced) {
        ctx.strokeStyle = 'rgba(120,170,230,.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
        drops.forEach((d) => { d.y += 0.012 * d.v; if (d.y > 1) { d.y = 0; d.x = Math.random(); } ctx.moveTo(d.x * w, d.y * h); ctx.lineTo(d.x * w - 3, d.y * h + 12); });
        ctx.stroke();
      }
    }
    requestAnimationFrame(frame);
  };
  draw(); requestAnimationFrame(frame);
}

/* ---------- ?test=1 ---------- */
function runTests() {
  import('./checks.js').then((m) => {
    const r = m.runChecks(), pass = r.filter((x) => x[1]).length;
    app.innerHTML = `<h2>Browser checks: ${pass} of ${r.length} pass</h2><ul class="tests">${r.map(([nm, ok]) => `<li class="${ok ? 'win' : 'behind'}">${ok ? '✔' : '✘'} ${nm}</li>`).join('')}</ul>`;
  });
}

/* ---------- boot ---------- */
document.addEventListener('keydown', (e) => game && game.key(e));
$('themeBtn').onclick = () => {
  const nx = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = nx; store.set('theme', nx);
};
const setPresent = (on) => { document.body.classList.toggle('present', on); store.set('present', on ? '1' : '0'); };
setPresent(qs.get('present') === '1' || store.get('present') === '1');
$('presentBtn').onclick = () => setPresent(!document.body.classList.contains('present'));
addEventListener('hashchange', route);
if (qs.get('shift') && SHIFTS[qs.get('shift')] && !location.hash) location.hash = '#/play/' + qs.get('shift');
route();
$('loader').remove();
