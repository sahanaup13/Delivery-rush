import { MinHeap } from './engine/heap.js';
import { bfs } from './engine/bfs.js';
import { quote, W, H } from './engine/sim.js';
export const CONCEPTS = [['pq', 'Priority Queue'], ['bfs', 'BFS'], ['greedy', 'Greedy'], ['fifo', 'Queue']];

function heapSvg(list) {
  if (!list.length) return '<p class="meta">No orders waiting.</p>';
  const h = new MinHeap((o) => o.t); list.forEach((o) => h.push(o));
  const pos = h.a.map((o, n) => {
    const lv = Math.floor(Math.log2(n + 1)), c = 2 ** lv;
    return { o, x: ((n + 1 - c + 0.5) / c) * 300, y: 24 + lv * 46 };
  });
  let s = '<svg viewBox="0 0 300 150" class="viz">';
  pos.forEach((p, n) => { if (n) { const q = pos[(n - 1) >> 1]; s += `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="var(--line)" stroke-width="2"/>`; } });
  pos.forEach((p, n) => (s += `<circle cx="${p.x}" cy="${p.y}" r="18" fill="${n ? 'var(--home)' : 'var(--accent)'}"/><text x="${p.x}" y="${p.y - 2}" text-anchor="middle" font-size="10">${p.o.label}</text><text x="${p.x}" y="${p.y + 9}" text-anchor="middle" font-size="9">t=${p.o.t}</text>`));
  return s + '</svg><p class="meta">The root is the earliest order. It leaves first.</p>';
}
function bfsSvg(shift, o) {
  const d = bfs(shift.blocked, W, H, o.rest[0], o.rest[1]), max = Math.max(...d), S = 14;
  let s = `<svg viewBox="0 0 ${W * S} ${H * S}" class="viz">`;
  d.forEach((v, n) => {
    const x = (n % W) * S, y = Math.floor(n / W) * S;
    s += v < 0 ? `<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="var(--block)"/>` : `<rect x="${x}" y="${y}" width="${S}" height="${S}" fill="var(--accent)" fill-opacity="${(0.12 + 0.88 * (1 - v / max)).toFixed(2)}" stroke="var(--cell)"/>`;
  });
  s += `<rect x="${o.rest[0] * S}" y="${o.rest[1] * S}" width="${S}" height="${S}" fill="var(--rest)"/><rect x="${o.home[0] * S}" y="${o.home[1] * S}" width="${S}" height="${S}" fill="var(--home)"/>`;
  return s + `</svg><p class="meta">Darker means closer to the restaurant. Home is ${d[o.home[1] * W + o.home[0]]} steps away.</p>`;
}
function greedy(shift, run, o) {
  const qs = run.riders.map((r) => ({ id: r.name || r.id, t: quote(shift, r, o).time }));
  const best = Math.min(...qs.map((q) => q.t)), max = Math.max(...qs.map((q) => q.t));
  return qs.map((q) => `<div class="bar${q.t === best ? ' best' : ''}"><span>${q.id}</span><i style="width:${(q.t / max) * 100}%"></i><b>${q.t} min</b></div>`).join('') + '<p class="meta">Greedy picks the shortest bar.</p>';
}
function slots(orders, i) {
  return '<div class="slots">' + orders.slice(i, i + 8).map((o, n) => `<span class="${n ? '' : 'front'}">${o.label}</span>`).join('') + '</div><p class="meta">First in, first out. The left slot is served next.</p>';
}
const card = (t, b) => `<div class="vz"><h3>${t}</h3>${b}</div>`;
// only = 'pq' | 'bfs' | 'greedy' | 'fifo' shows one concept; omit it to show all four.
export function vizHtml(shift, run, i, only) {
  const n = shift.orders.length;
  if (!only && i >= n) return '<p class="meta">Shift finished. Press Play again, or switch to Inspect algorithm to replay every decision.</p>';
  const o = shift.orders[Math.min(i, n - 1)];
  const parts = {
    pq: card('Priority queue', heapSvg(shift.orders.slice(i, i + 7))),
    bfs: card('BFS wavefront', bfsSvg(shift, o)),
    greedy: card('Greedy choice', greedy(shift, run, o)),
    fifo: card('FIFO queue', slots(shift.orders, i)),
  };
  return only ? parts[only] : Object.values(parts).join('');
}
