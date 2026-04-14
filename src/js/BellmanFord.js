export class BellmanFord {
  constructor(nodes, edges, source) {
    this.nodes = nodes;
    this.edges = edges;
    this.source = source;
    this.maxRound = nodes.length - 1;
    this.dist = {};
    this.prev = {};
    this.round = 0;
    this.reset();
  }

  reset() {
    for (const n of this.nodes) {
      this.dist[n.id] = Infinity;
      this.prev[n.id] = null;
    }
    this.dist[this.source] = 0;
    this.round = 0;
  }

  relaxOnce() {
    if (this.round >= this.maxRound) {
      return { done: true, negativeCycle: this.#detectNegativeCycle(), changed: [], relaxed: [] };
    }
    this.round += 1;
    const changed = [];
    const relaxed = [];
    for (const [u, v, w] of this.edges) {
      if (this.dist[u] + w < this.dist[v]) {
        this.dist[v] = this.dist[u] + w;
        this.prev[v] = u;
        changed.push(v);
        relaxed.push(`${u}-${v}`);
      }
    }
    return { done: false, negativeCycle: false, changed, relaxed };
  }

  #detectNegativeCycle() {
    for (const [u, v, w] of this.edges) {
      if (this.dist[u] + w < this.dist[v]) return true;
    }
    return false;
  }

  getState() {
    return { dist: { ...this.dist }, prev: { ...this.prev }, round: this.round };
  }

  runAll() {
    this.reset();
    for (let i = 0; i < this.maxRound; i += 1) this.relaxOnce();
    return this.getState();
  }

  getPath(target) {
    const out = [];
    let cur = target;
    const seen = new Set();
    while (cur != null && !seen.has(cur)) {
      seen.add(cur);
      out.unshift(cur);
      if (cur === this.source) break;
      cur = this.prev[cur];
    }
    return out[0] === this.source ? out : [];
  }

  findNegativeCycle() {
    let x = null;
    for (const [u, v, w] of this.edges) {
      if (this.dist[u] + w < this.dist[v]) {
        x = v;
        break;
      }
    }
    if (x == null) return null;
    for (let i = 0; i < this.nodes.length; i += 1) x = this.prev[x];
    const cycle = [];
    let cur = x;
    let safety = this.nodes.length + 1;
    do {
      cycle.push(cur);
      cur = this.prev[cur];
      safety -= 1;
      if (safety < 0) break;
    } while (cur !== x && cur != null);
    cycle.push(x);
    return cycle.reverse();
  }
}
