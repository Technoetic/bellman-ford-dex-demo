// 목업 DEX 데이터 — 실제 1inch/Paraswap의 단순화 버전
// 환율(rate)은 2026년 기준 대략적인 시장가이며 교육용 수치.

export const TOKENS = [
  { id: "USDC", name: "USD Coin", x: 100, y: 180, color: "#2775CA", icon: "💵" },
  { id: "ETH", name: "Ethereum", x: 300, y: 80, color: "#627EEA", icon: "Ξ" },
  { id: "DAI", name: "DAI", x: 300, y: 280, color: "#F5AC37", icon: "◈" },
  { id: "WBTC", name: "Wrapped BTC", x: 500, y: 120, color: "#F09242", icon: "₿" },
  { id: "LINK", name: "Chainlink", x: 500, y: 240, color: "#2A5ADA", icon: "🔗" },
];

// [from, to, rate, venue]
// rate = "1 from → rate * to" (1 USDC → (1/3000) ETH 이면 rate = 1/3000)

// 기본 POOLS: arbitrage 없는 "정상 시장" — 최적 경로 라우팅 데모용
export const POOLS = [
  // USDC 쌍
  ["USDC", "ETH", 1 / 3000, "Uniswap v3"],
  ["ETH", "USDC", 2998, "Uniswap v3"],
  ["USDC", "DAI", 0.999, "Curve"],
  ["DAI", "USDC", 1.0, "Curve"],
  ["USDC", "LINK", 1 / 14.9, "Sushi"],
  ["LINK", "USDC", 14.7, "Sushi"],
  ["USDC", "WBTC", 1 / 65200, "Uniswap v3"],
  ["WBTC", "USDC", 64900, "Uniswap v3"],

  // ETH 쌍 (정상 환율)
  ["ETH", "DAI", 2999, "SushiSwap"],
  ["DAI", "ETH", 1 / 3001, "SushiSwap"],
  ["ETH", "LINK", 201, "Uniswap v3"],
  ["LINK", "ETH", 1 / 202, "Uniswap v3"],
  ["ETH", "WBTC", 1 / 21.5, "Balancer"],
  ["WBTC", "ETH", 21.4, "Balancer"],

  // DAI 쌍
  ["DAI", "LINK", 1 / 15.05, "Sushi"],
  ["LINK", "DAI", 14.85, "Sushi"],
];

// POOLS_ARB: "이상 시장" — arbitrage 탐지 데모용
// ETH→DAI 환율이 비정상적으로 높아(3020) USDC → ETH → DAI → USDC 한 바퀴에 차익 발생
// 곱 = (1/3000) × 3020 × 1.0 = 1.00667 → +0.67% 이익
export const POOLS_ARB = POOLS.map((p) => {
  if (p[0] === "ETH" && p[1] === "DAI") return ["ETH", "DAI", 3020, "SushiSwap (미스프라이싱)"];
  return p;
});

// 벨먼-포드용: 가중치 = -log(rate)
// 최소 가중치 경로 = 최대 rate 곱 경로 = 가장 많이 받는 경로
export function toWeightedEdges(pools) {
  return pools.map(([u, v, rate]) => [u, v, -Math.log(rate)]);
}
