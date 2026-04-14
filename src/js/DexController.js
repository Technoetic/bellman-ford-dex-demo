import { BellmanFord } from "./BellmanFord.js";
import { POOLS, POOLS_ARB, TOKENS, toWeightedEdges } from "./dexData.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(name, attrs = {}, text) {
  const el = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (text != null) el.textContent = text;
  return el;
}

function findPoolIn(pools, from, to) {
  return pools.find((p) => p[0] === from && p[1] === to);
}

function computeAmountOut(pools, path, amountIn) {
  let amt = amountIn;
  const steps = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    const pool = findPoolIn(pools, path[i], path[i + 1]);
    if (!pool) return { amt: 0, steps };
    amt *= pool[2];
    steps.push({ from: path[i], to: path[i + 1], rate: pool[2], venue: pool[3], running: amt });
  }
  return { amt, steps };
}

function fmt(n, digits = 6) {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  if (n >= 1) return n.toFixed(Math.min(digits, 4));
  return n.toFixed(digits);
}

export class DexController {
  constructor() {
    this.svg = document.getElementById("dexGraph");
    this.fromSel = document.getElementById("dexFrom");
    this.toSel = document.getElementById("dexTo");
    this.amountIn = document.getElementById("dexAmount");
    this.btnRoute = document.getElementById("dexFindRoute");
    this.btnArb = document.getElementById("dexArb");
    this.resultEl = document.getElementById("dexResult");

    this.populateSelects();
    this.btnRoute.addEventListener("click", () => this.onFindRoute());
    this.btnArb.addEventListener("click", () => this.onDetectArb());
  }

  start() {
    this.drawGraph();
    this.fromSel.value = "USDC";
    this.toSel.value = "LINK";
    this.amountIn.value = "1000";
    this.onFindRoute();
  }

  populateSelects() {
    for (const sel of [this.fromSel, this.toSel]) {
      sel.innerHTML = "";
      for (const t of TOKENS) {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = `${t.icon} ${t.id} · ${t.name}`;
        sel.appendChild(opt);
      }
    }
  }

  drawGraph(highlightPath = [], arbCycle = null, pools = POOLS) {
    this.svg.innerHTML = "";

    // defs: arrow markers
    const defs = svgEl("defs");
    const addMarker = (id, color) => {
      const m = svgEl("marker", {
        id,
        viewBox: "0 0 10 10",
        refX: 18,
        refY: 5,
        markerWidth: 6,
        markerHeight: 6,
        orient: "auto-start-reverse",
      });
      m.appendChild(svgEl("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: color }));
      defs.appendChild(m);
    };
    addMarker("dex-arrow", "#2a2a2a");
    addMarker("dex-arrow-path", "#f5d547");
    addMarker("dex-arrow-arb", "#ef5350");
    this.svg.appendChild(defs);

    // background dots
    const bg = svgEl("g");
    for (let x = 20; x < 600; x += 20) {
      for (let y = 20; y < 360; y += 20) {
        bg.appendChild(svgEl("circle", { cx: x, cy: y, r: 1, class: "map-dot" }));
      }
    }
    this.svg.appendChild(bg);

    const nodeMap = Object.fromEntries(TOKENS.map((t) => [t.id, t]));
    const pathSet = new Set();
    for (let i = 0; i < highlightPath.length - 1; i += 1) {
      pathSet.add(`${highlightPath[i]}-${highlightPath[i + 1]}`);
    }
    const arbSet = new Set();
    if (arbCycle) {
      for (let i = 0; i < arbCycle.length - 1; i += 1) {
        arbSet.add(`${arbCycle[i]}-${arbCycle[i + 1]}`);
      }
    }

    // Edges: 양방향 풀이므로 살짝 휘게
    pools.forEach(([u, v, rate, venue]) => {
      const a = nodeMap[u];
      const b = nodeMap[v];
      if (!a || !b) return;
      const reverse = pools.some((p) => p[0] === v && p[1] === u);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      let cx = mx;
      let cy = my;
      if (reverse) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const len = Math.hypot(dx, dy);
        cx = mx + (-dy / len) * 18;
        cy = my + (dx / len) * 18;
      }
      const key = `${u}-${v}`;
      let cls = "dex-edge";
      let marker = "url(#dex-arrow)";
      if (arbSet.has(key)) {
        cls += " dex-edge--arb";
        marker = "url(#dex-arrow-arb)";
      } else if (pathSet.has(key)) {
        cls += " dex-edge--path";
        marker = "url(#dex-arrow-path)";
      }
      this.svg.appendChild(
        svgEl("path", {
          d: `M ${a.x} ${a.y} Q ${cx} ${cy} ${b.x} ${b.y}`,
          class: cls,
          fill: "none",
          "marker-end": marker,
        }),
      );
    });

    // Nodes (tokens)
    for (const t of TOKENS) {
      const g = svgEl("g");
      g.appendChild(
        svgEl("circle", {
          cx: t.x,
          cy: t.y,
          r: 30,
          class: "dex-node",
          fill: `${t.color}22`,
          stroke: t.color,
          "stroke-width": 2,
        }),
      );
      g.appendChild(
        svgEl(
          "text",
          {
            x: t.x,
            y: t.y - 4,
            class: "dex-node-icon",
            fill: t.color,
          },
          t.icon,
        ),
      );
      g.appendChild(
        svgEl(
          "text",
          {
            x: t.x,
            y: t.y + 14,
            class: "dex-node-label",
          },
          t.id,
        ),
      );
      this.svg.appendChild(g);
    }
  }

  onFindRoute() {
    const from = this.fromSel.value;
    const to = this.toSel.value;
    const amount = Number(this.amountIn.value) || 0;
    if (from === to) {
      this.#renderResult({
        ok: false,
        title: "FROM과 TO가 같습니다",
        body: "다른 토큰을 선택하세요.",
      });
      this.drawGraph();
      return;
    }
    // 정상 시장 (POOLS) 사용
    const pools = POOLS;
    const edges = toWeightedEdges(pools);
    const bf = new BellmanFord(TOKENS, edges, from);
    bf.runAll();
    const path = bf.getPath(to);
    if (path.length === 0) {
      this.#renderResult({
        ok: false,
        title: "경로를 찾지 못했습니다",
        body: `${from} → ${to}로 가는 풀이 없습니다.`,
      });
      this.drawGraph([], null, pools);
      return;
    }
    const { amt, steps } = computeAmountOut(pools, path, amount);

    // 직접 스왑(1 hop)과 비교
    const direct = findPoolIn(pools, from, to);
    const directAmt = direct ? amount * direct[2] : 0;
    const improvement = directAmt > 0 ? ((amt / directAmt - 1) * 100).toFixed(2) : null;

    this.drawGraph(path, null, pools);
    this.#renderResult({
      ok: true,
      title: `${amount} ${from} → ${fmt(amt)} ${to}`,
      path,
      steps,
      improvement,
      directAmt: direct ? fmt(directAmt) : null,
      direct: Boolean(direct),
      hops: path.length - 1,
    });
  }

  onDetectArb() {
    // 이상 시장 POOLS_ARB 사용 (ETH→DAI 미스프라이싱 포함)
    const pools = POOLS_ARB;
    const edges = toWeightedEdges(pools);
    const bf = new BellmanFord(TOKENS, edges, "USDC");
    bf.runAll();
    const cycle = bf.findNegativeCycle();
    if (!cycle || cycle.length < 2) {
      this.#renderResult({
        ok: true,
        title: "✓ Arbitrage 없음",
        body: "현재 환율로는 한 바퀴 돌아 이익을 얻는 경로가 없습니다.",
      });
      this.drawGraph([], null, pools);
      return;
    }
    // 사이클 이익 계산
    let running = 1;
    const legs = [];
    for (let i = 0; i < cycle.length - 1; i += 1) {
      const pool = findPoolIn(pools, cycle[i], cycle[i + 1]);
      if (!pool) {
        this.#renderResult({
          ok: false,
          title: "사이클 재구성 실패",
          body: `${cycle.join(" → ")} 중 풀 누락`,
        });
        return;
      }
      running *= pool[2];
      legs.push({ from: cycle[i], to: cycle[i + 1], rate: pool[2], venue: pool[3] });
    }
    const profitPct = ((running - 1) * 100).toFixed(3);

    this.drawGraph([], cycle, pools);
    this.#renderResult({
      ok: true,
      title: `💰 Arbitrage 기회 발견: +${profitPct}%`,
      arb: true,
      cycle,
      legs,
      running,
    });
  }

  #renderResult(r) {
    this.resultEl.innerHTML = "";
    const card = document.createElement("div");
    card.className = `dex-result${r.ok ? "" : " dex-result--err"}${r.arb ? " dex-result--arb" : ""}`;

    const h = document.createElement("h4");
    h.textContent = r.title;
    card.appendChild(h);

    if (r.body) {
      const p = document.createElement("p");
      p.textContent = r.body;
      card.appendChild(p);
    }

    if (r.path) {
      const routeLine = document.createElement("div");
      routeLine.className = "dex-route-line";
      routeLine.innerHTML = r.path
        .map((id) => `<span class="dex-chip">${id}</span>`)
        .join('<span class="dex-arr">→</span>');
      card.appendChild(routeLine);

      const steps = document.createElement("ol");
      steps.className = "dex-steps";
      for (const s of r.steps) {
        const li = document.createElement("li");
        li.innerHTML =
          `<b>${s.from} → ${s.to}</b> ` +
          `<span class="venue">${s.venue}</span> ` +
          `<span class="rate">× ${fmt(s.rate)}</span> ` +
          `<span class="running">누적: ${fmt(s.running)}</span>`;
        steps.appendChild(li);
      }
      card.appendChild(steps);

      if (r.direct && r.improvement != null) {
        const cmp = document.createElement("p");
        cmp.className = "dex-compare";
        const sign = Number(r.improvement) >= 0 ? "+" : "";
        cmp.innerHTML =
          `직접 스왑(${r.path[0]} → ${r.path[r.path.length - 1]}): <b>${r.directAmt}</b> · ` +
          `멀티홉 라우팅 이득: <b class="${Number(r.improvement) >= 0 ? "up" : "down"}">${sign}${r.improvement}%</b>`;
        card.appendChild(cmp);
      } else if (!r.direct) {
        const note = document.createElement("p");
        note.className = "dex-compare";
        note.innerHTML = `직접 풀 없음 → <b>반드시</b> 멀티홉 라우팅 필요 (Dijkstra도 가능하지만 음수 비용이 섞이면 벨먼-포드만 정답을 보장)`;
        card.appendChild(note);
      }
    }

    if (r.arb && r.cycle) {
      const line = document.createElement("div");
      line.className = "dex-route-line dex-route-line--arb";
      line.innerHTML = r.cycle
        .map((id) => `<span class="dex-chip">${id}</span>`)
        .join('<span class="dex-arr">→</span>');
      card.appendChild(line);

      const steps = document.createElement("ol");
      steps.className = "dex-steps";
      for (const s of r.legs) {
        const li = document.createElement("li");
        li.innerHTML =
          `<b>${s.from} → ${s.to}</b> ` +
          `<span class="venue">${s.venue}</span> ` +
          `<span class="rate">× ${fmt(s.rate)}</span>`;
        steps.appendChild(li);
      }
      card.appendChild(steps);

      const cmp = document.createElement("p");
      cmp.className = "dex-compare";
      cmp.innerHTML =
        `1 단위 시작 → 한 바퀴 돌면 <b class="up">${fmt(r.running)}</b> → ` +
        `<b class="up">순이익 ${((r.running - 1) * 100).toFixed(3)}%</b> ` +
        `(벨먼-포드가 V번째 라운드에서 거리 감소를 감지 = 음수 사이클)`;
      card.appendChild(cmp);
    }

    this.resultEl.appendChild(card);
  }
}
