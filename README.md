# 💱 Bellman-Ford · DEX Swap Routing Demo

벨먼-포드 알고리즘을 사용한 **DEX 스왑 라우팅** 인터랙티브 데모.

5개 토큰(USDC / ETH / DAI / WBTC / LINK)과 14개 유동성 풀이 있는 그래프에서
`-log(rate)` 가중치로 **최적 경로**를 찾고, 시장 미스프라이싱이 있을 때
**음수 사이클(arbitrage)**을 탐지합니다.

## 인터랙션

- **FROM / TO / 수량** 선택 → `🔍 최적 경로 찾기`
  - 벨먼-포드가 V-1 라운드 완화로 최대 rate 곱 경로 계산
  - 직접 스왑(1 hop)과 멀티홉 라우팅의 이득률 비교
- `💰 Arbitrage 탐지`
  - 이상 시장(ETH→DAI 미스프라이싱 포함)에서 음수 사이클 탐지
  - 사이클에 해당하는 간선을 빨간 점선으로 하이라이트
  - 한 바퀴 돌 때 순이익률 계산

## 실행

```bash
npm install
npm run dev       # http://localhost:8765
npm run build     # dist/index.html 단일 파일 빌드
npm test          # vitest (BellmanFord 단위 테스트)
```

## 구조

```
index.html             # 단일 페이지
src/
  css/
    tokens.css         # 디자인 토큰 (8px 그리드, 단일 액센트)
    base.css
    nav.css
    layout.css         # 뷰포트 풀필, 스크롤 없음
    dex.css            # DEX UI + 공통 버튼/라벨
    main.css           # @import 집계
  js/
    dexData.js         # 5 토큰 · 14 풀 · POOLS_ARB (arbitrage)
    BellmanFord.js     # runAll / getPath / findNegativeCycle
    DexController.js   # SVG 렌더링 + 드롭다운/버튼 이벤트
    app.js             # 엔트리
bundle.cjs             # 단일 HTML 빌드 스크립트
```

## 핵심 아이디어

- 토큰 쌍 환율 `rate`에 `-log(rate)`를 씌우면 **곱이 덧셈**이 된다.
- 가장 많이 받는 경로 = rate 곱이 최대 = `-log` 합이 **최소** = 벨먼-포드 최단 경로.
- 한 바퀴 돌아 이익이 나오면 `-log` 합이 **음수** = 음수 사이클 = arbitrage.

## 실제 사례

1inch / Paraswap 같은 DEX 애그리게이터가 실제로 이 원리로 최적 스왑과 arbitrage를 탐지합니다.
사용자에게는 `Swap` 버튼 하나로 보이지만 뒤에서는 이 그래프와 같은 완화 과정이 돌아갑니다.

## 라이선스

MIT
