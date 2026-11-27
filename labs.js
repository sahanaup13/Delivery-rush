import { MinHeap } from './engine/heap.js';
import { Queue } from './engine/queue.js';
import { bfs, bfsPath } from './engine/bfs.js';

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let timers = [];
export const stopLabs = () => { timers.forEach(clearInterval); timers = []; };
export const LABS = [
  ['pq', 'Priority Queue', 'Hospital emergency room', 'The most urgent patient is treated first, not the one who arrived first.'],
  ['bfs', 'BFS', 'Emergency exit finder', 'Find the shortest way out of a building, or the fewest hops between two places.'],
  ['greedy', 'Greedy', 'Cashier change maker', 'Always take the biggest coin that fits. Fast, but see when it fails.'],
  ['queue', 'Queue', 'Bank token counter', 'First come, first served. Add counters and watch the waiting time drop.'],
];
export const algoIndex = () => `<h2>Algorithms</h2><p>Pick one and try it on a real problem. Everything here is interactive.</p>
  <div class="cards">${LABS.map(([id, t, p, d]) => `<a class="card" href="#/algo/${id}"><h3>${t}</h3><p><b>${p}</b></p><p class="meta">${d}</p></a>`).join('')}</div>`;

export function renderLab(app, id) {
  stopLabs();
  const m = LABS.find((l) => l[0] === id), run = { pq: pqLab, bfs: bfsLab, greedy: greedyLab, queue: queueLab }[id];
  app.innerHTML = `<p><a href="#/algo">← All algorithms</a></p>
    <div class="pillbar">${LABS.map((l) => `<a class="${l[0] === id ? 'on' : ''}" href="#/algo/${l[0]}">${l[1]}</a>`).join('')}</div>
    <h2>${m[1]}: ${m[2]}</h2><p>${m[3]}</p><div id="lab"></div>`;
  run($('lab'));
}

/* ---------- Priority queue: emergency room ---------- */
const SEV = [null, 'Critical', 'Serious', 'Moderate', 'Minor', 'Routine'];
const SEVC = [null, '#d64545', '#e6803f', '#c9a227', '#5b7bd5', '#4f9d7f'];
const NAMES = ['Ravi', 'Meena', 'Arjun', 'Fatima', 'Kiran', 'Sneha', 'Imran', 'Divya', 'John', 'Lata', 'Omar', 'Priya'];
function pqLab(el) {
  const heap = new MinHeap((p) => p.sev * 1e6 + p.seq);
  let seq = 0, treated = [], note = 'Add patients, then treat the next one.';
  el.innerHTML = `<div class="labbar"><input id="pn" placeholder="Patient name" maxlength="8"/>
    <select id="ps">${[1, 2, 3, 4, 5].map((s) => `<option value="${s}" ${s === 3 ? 'selected' : ''}>${s}. ${SEV[s]}</option>`).join('')}</select>
    <button id="add">Add patient</button><button id="rand">Add 5 random</button><button id="next">Treat next patient</button><button id="reset">Reset</button></div>
    <p id="note" class="meta"></p><div id="tree"></div><div id="rest"></div>
    <p class="real"><b>Where you see it:</b> hospital triage, the operating system choosing which program runs next, Dijkstra's shortest path, and task schedulers.</p>`;
  const add = (name, sev) => {
    if (heap.size >= 15) { note = 'The ward is full (15 patients). Treat someone first.'; return; }
    const n = ++seq, b = heap.swaps, nm = name || NAMES[(n - 1) % NAMES.length];
    heap.push({ name: nm, sev, seq: n });
    note = `Added ${nm} (${SEV[sev]}). The heap fixed itself with ${heap.swaps - b} swap(s).`;
  };
  const draw = () => {
    $('note').textContent = note;
    const n = heap.size;
    if (!n) $('tree').innerHTML = '<p class="meta">Nobody is waiting.</p>';
    else {
      const lv = Math.floor(Math.log2(n)) + 1;
      const pos = heap.a.map((p, i) => { const l = Math.floor(Math.log2(i + 1)), c = 2 ** l; return { p, x: ((i + 1 - c + 0.5) / c) * 640, y: 30 + l * 64 }; });
      let s = `<svg viewBox="0 0 640 ${lv * 64 + 10}" class="viz">`;
      pos.forEach((q, i) => { if (i) { const r = pos[(i - 1) >> 1]; s += `<line x1="${q.x}" y1="${q.y}" x2="${r.x}" y2="${r.y}" stroke="var(--line)" stroke-width="2"/>`; } });
      pos.forEach((q, i) => (s += `<circle cx="${q.x}" cy="${q.y}" r="24" fill="${SEVC[q.p.sev]}" stroke="${i ? 'none' : 'var(--text)'}" stroke-width="3"/><text x="${q.x}" y="${q.y - 2}" text-anchor="middle" font-size="11">${esc(q.p.name)}</text><text x="${q.x}" y="${q.y + 11}" text-anchor="middle" font-size="9">#${q.p.seq}</text>`));
      $('tree').innerHTML = s + '</svg>';
    }
    const root = heap.a[0];
    $('rest').innerHTML = `${root ? `<p><b>Treated next:</b> ${esc(root.name)} (${SEV[root.sev]}, arrived #${root.seq})</p>` : ''}
      <p class="meta">Colour shows urgency: red is critical, green is routine. The circled patient at the top is always the most urgent.</p>
      ${treated.length ? `<p><b>Treated so far</b></p><ol>${treated.map((p) => `<li>${esc(p.name)}: ${SEV[p.sev]}, arrived #${p.seq}</li>`).join('')}</ol>` : ''}`;
  };
  $('add').onclick = () => { add($('pn').value.trim(), +$('ps').value); $('pn').value = ''; draw(); };
  $('rand').onclick = () => { for (let i = 0; i < 5; i++) add('', 1 + Math.floor(Math.random() * 5)); draw(); };
  $('next').onclick = () => {
    const b = heap.swaps, p = heap.pop();
    note = p ? `Treated ${p.name} (${SEV[p.sev]}, arrived #${p.seq}). ${heap.swaps - b} swap(s) to fix the heap.` : 'Nobody is waiting.';
    if (p) treated.push(p); draw();
  };
  $('reset').onclick = () => { while (heap.size) heap.pop(); seq = 0; treated = []; note = 'Add patients, then treat the next one.'; draw(); };
  draw();
}

/* ---------- BFS: emergency exit finder ---------- */
function bfsLab(el) {
  const W = 16, H = 10, S = 36, walls = new Set();
  let start = [1, 1], exit = [14, 8], tool = 'wall', D = null, layer = -1, path = [], anim = null, adding = true, max = 0;
  el.innerHTML = `<div class="labbar"><div class="pillbar" id="tools">${[['wall', 'Draw walls'], ['start', 'Move start'], ['exit', 'Move exit']].map(([t, l]) => `<button data-t="${t}" class="${t === 'wall' ? 'on' : ''}">${l}</button>`).join('')}</div>
    <button id="run">Run BFS</button><button id="rwalls">Random walls</button><button id="clear">Clear</button></div>
    <p id="stat" class="meta">Click or drag to draw walls, then press Run BFS.</p><svg id="g" viewBox="0 0 ${W * S} ${H * S}" class="gridlab"></svg>
    <p class="real"><b>Where you see it:</b> GPS and map apps, building evacuation plans, game characters finding a path, and "how many hops between two people" on social networks. BFS always finds the fewest steps.</p>`;
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  const stop = () => { clearInterval(anim); anim = null; };
  const draw = () => {
    let s = '';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const d = D ? D[y * W + x] : -1;
      const fill = walls.has(x + ',' + y) ? 'var(--block)' : d >= 0 && d <= layer ? 'var(--accent)' : 'var(--cell)';
      s += `<rect x="${x * S}" y="${y * S}" width="${S}" height="${S}" fill="${fill}" fill-opacity="${fill === 'var(--accent)' ? (0.25 + 0.5 * (1 - d / (max + 1))).toFixed(2) : 1}" stroke="var(--line)"/>`;
    }
    if (path.length) s += `<polyline points="${path.map((p) => `${p[0] * S + S / 2},${p[1] * S + S / 2}`).join(' ')}" fill="none" stroke="var(--rest)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += `<rect x="${start[0] * S + 3}" y="${start[1] * S + 3}" width="${S - 6}" height="${S - 6}" rx="6" fill="var(--rest)"/><text x="${start[0] * S + S / 2}" y="${start[1] * S + 23}" text-anchor="middle">S</text>`;
    s += `<rect x="${exit[0] * S + 3}" y="${exit[1] * S + 3}" width="${S - 6}" height="${S - 6}" rx="6" fill="var(--home)"/><text x="${exit[0] * S + S / 2}" y="${exit[1] * S + 23}" text-anchor="middle">E</text>`;
    $('g').innerHTML = s;
  };
  const reset = () => { stop(); D = null; layer = -1; path = []; };
  const cell = (e) => { const r = $('g').getBoundingClientRect(); return [Math.min(W - 1, Math.max(0, Math.floor((e.clientX - r.left) / r.width * W))), Math.min(H - 1, Math.max(0, Math.floor((e.clientY - r.top) / r.height * H)))]; };
  const apply = (c) => {
    reset(); const k = c.join(',');
    if (tool === 'wall') { if (same(c, start) || same(c, exit)) return; adding ? walls.add(k) : walls.delete(k); }
    else { walls.delete(k); if (tool === 'start' && !same(c, exit)) start = c; if (tool === 'exit' && !same(c, start)) exit = c; }
    $('stat').textContent = 'Press Run BFS to search again.'; draw();
  };
  $('g').onpointerdown = (e) => { const c = cell(e); adding = !walls.has(c.join(',')); apply(c); };
  $('g').onpointermove = (e) => { if (e.buttons && tool === 'wall') apply(cell(e)); };
  document.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tool = b.dataset.t; document.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('clear').onclick = () => { walls.clear(); reset(); $('stat').textContent = 'Cleared. Draw some walls.'; draw(); };
  $('rwalls').onclick = () => {
    walls.clear(); reset();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (Math.random() < 0.28 && !same([x, y], start) && !same([x, y], exit)) walls.add(x + ',' + y);
    $('stat').textContent = 'Random walls placed. Press Run BFS.'; draw();
  };
  $('run').onclick = () => {
    reset(); D = bfs(walls, W, H, start[0], start[1]);
    const t = D[exit[1] * W + exit[0]]; max = t >= 0 ? t : Math.max(...D);
    anim = setInterval(() => {
      layer++;
      if (layer > max) {
        stop();
        if (t >= 0) path = bfsPath(walls, W, H, start, exit);
        const seen = D.filter((v) => v >= 0 && v <= max).length;
        $('stat').textContent = t >= 0 ? `Shortest route: ${t} steps. BFS looked at ${seen} cells.` : `No route. The walls block every way out (BFS checked ${seen} cells).`;
      } else $('stat').textContent = `Spreading outward: ${layer} step${layer === 1 ? '' : 's'} from the start`;
      draw();
    }, 80);
    timers.push(anim);
  };
  draw();
}

/* ---------- Greedy: cashier change maker ---------- */
const COINS = { 'Indian rupees (1 to 500)': [500, 200, 100, 50, 20, 10, 5, 2, 1], 'US coins (1 to 25 cents)': [25, 10, 5, 1], 'Tricky coins (1, 3, 4)': [4, 3, 1] };
function greedyLab(el) {
  el.innerHTML = `<div class="labbar"><label>Amount <input id="amt" type="number" min="1" max="5000" value="289"/></label>
    <label>Coins <select id="set">${Object.keys(COINS).map((n) => `<option>${n}</option>`).join('')}</select></label></div><div id="out"></div>
    <p class="real"><b>Where you see it:</b> ATMs and cash registers, Huffman compression, scheduling the most meetings in one room, and Dijkstra's shortest path. Greedy is fast because it never looks back, but it is only guaranteed best for some problems.</p>`;
  const run = () => {
    const coins = COINS[$('set').value], amount = Math.max(1, Math.min(5000, Math.floor(Number($('amt').value)) || 1));
    let rem = amount; const steps = [], used = [];
    for (const c of coins) { const k = Math.floor(rem / c); if (k) { steps.push(`Take ${k} × ${c}, ${rem - k * c} left`); for (let i = 0; i < k; i++) used.push(c); rem -= k * c; } }
    const dp = [0];
    for (let a = 1; a <= amount; a++) { dp[a] = Infinity; for (const c of coins) if (c <= a && dp[a - c] + 1 < dp[a]) dp[a] = dp[a - c] + 1; }
    const best = dp[amount], ok = used.length === best;
    $('out').innerHTML = `<p><b>Greedy gives ${used.length} coin${used.length > 1 ? 's' : ''}:</b></p><div class="chips">${used.slice(0, 60).map((c) => `<span>${c}</span>`).join('')}${used.length > 60 ? '<span>…</span>' : ''}</div>
      <ol>${steps.map((x) => `<li>${x}</li>`).join('')}</ol>
      <p class="verdict ${ok ? 'win' : 'behind'}">${ok ? `Greedy matched the best possible answer (${best} coins).` : `The best possible answer is only ${best} coin${best > 1 ? 's' : ''}. Greedy got it wrong here.`}</p>
      ${ok ? '' : '<p class="meta">Greedy grabs the biggest coin first and never reconsiders. With some coin sets that wastes coins. Real currencies are designed so greedy works.</p>'}`;
  };
  $('amt').oninput = run;
  $('set').onchange = () => { if ($('set').value.startsWith('Tricky')) $('amt').value = 6; else if ($('amt').value < 10) $('amt').value = 289; run(); };
  run();
}

/* ---------- Queue: bank token counter ---------- */
function queueLab(el) {
  const SERVICE = 3;
  let q, counters = 1, rate = 0.5, tick, nid, desks, served, began, total, worst, running = false;
  const reset = () => { q = new Queue(); tick = 0; nid = 1; desks = [null, null, null]; served = 0; began = 0; total = 0; worst = 0; };
  reset();
  el.innerHTML = `<div class="labbar"><span>Counters</span><div class="pillbar" id="cn">${[1, 2, 3].map((n) => `<button data-n="${n}" class="${n === 1 ? 'on' : ''}">${n}</button>`).join('')}</div>
    <span>Customers</span><div class="pillbar" id="rt">${[['Few', 0.3], ['Normal', 0.5], ['Rush', 0.8]].map(([l, r]) => `<button data-r="${r}" class="${r === 0.5 ? 'on' : ''}">${l}</button>`).join('')}</div>
    <button id="go">Start</button><button id="addc">Add customer</button><button id="rst">Reset</button></div>
    <div id="desks" class="desks"></div><p><b>Waiting line</b> (first in line is served next)</p><div id="line" class="chips"></div><p id="stats"></p><p id="tip" class="meta"></p>
    <p class="real"><b>Where you see it:</b> bank and hospital token systems, print jobs, customer support tickets, and any server handling requests in order. One minute here is one tick of the clock, and each customer takes ${SERVICE} minutes to serve.</p>`;
  const draw = () => {
    $('desks').innerHTML = [0, 1, 2].filter((i) => i < counters || desks[i]).map((i) => `<div class="desk ${desks[i] ? 'busy' : ''}"><b>Counter ${i + 1}</b><span>${desks[i] ? `Serving T${desks[i].id}, ${desks[i].left} min left` : i < counters ? 'Free' : ''}</span></div>`).join('');
    $('line').innerHTML = q.size ? q.a.slice(q.h).map((c, n) => `<span class="${n ? '' : 'front'}">T${c.id}<small>${tick - c.arr}m</small></span>`).join('') : '<span class="meta">Nobody waiting</span>';
    $('stats').textContent = `Minute ${tick} · Served ${served} · In line ${q.size} · Average wait ${began ? (total / began).toFixed(1) : '0.0'} min · Longest wait ${worst} min`;
    $('tip').textContent = q.size > 8 ? 'The line keeps growing. Try adding a counter.' : counters === 3 && rate < 0.8 ? 'Three counters can easily keep up. Waits stay near zero.' : 'Try Rush with 1 counter, then add counters and compare the average wait.';
    $('go').textContent = running ? 'Pause' : 'Start';
  };
  const step = () => {
    tick++;
    if (Math.random() < rate) q.push({ id: nid++, arr: tick });
    for (let i = 0; i < 3; i++) if (desks[i] && --desks[i].left <= 0) { desks[i] = null; served++; }
    for (let i = 0; i < counters; i++) if (!desks[i] && q.size) { const c = q.shift(), w = tick - c.arr; began++; total += w; worst = Math.max(worst, w); desks[i] = { id: c.id, left: SERVICE }; }
  };
  timers.push(setInterval(() => { if (running) { step(); draw(); } }, 700));
  $('go').onclick = () => { running = !running; draw(); };
  $('addc').onclick = () => { q.push({ id: nid++, arr: tick }); draw(); };
  $('rst').onclick = () => { running = false; reset(); draw(); };
  document.querySelectorAll('[data-n]').forEach((b) => (b.onclick = () => { counters = +b.dataset.n; document.querySelectorAll('[data-n]').forEach((x) => x.classList.toggle('on', x === b)); draw(); }));
  document.querySelectorAll('[data-r]').forEach((b) => (b.onclick = () => { rate = +b.dataset.r; document.querySelectorAll('[data-r]').forEach((x) => x.classList.toggle('on', x === b)); }));
  draw();
}
