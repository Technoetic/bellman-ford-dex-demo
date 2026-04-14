import { describe, expect, it } from "vitest";
import { BellmanFord } from "../BellmanFord.js";

const NODES = [{ id: "A" }, { id: "B" }, { id: "C" }, { id: "D" }];

describe("BellmanFord", () => {
  describe("초기화", () => {
    it("source 거리는 0, 나머지는 Infinity", () => {
      const bf = new BellmanFord(NODES, [], "A");
      expect(bf.dist.A).toBe(0);
      expect(bf.dist.B).toBe(Infinity);
      expect(bf.dist.C).toBe(Infinity);
      expect(bf.dist.D).toBe(Infinity);
    });

    it("prev는 모두 null, round는 0", () => {
      const bf = new BellmanFord(NODES, [], "A");
      expect(bf.prev.A).toBeNull();
      expect(bf.prev.B).toBeNull();
      expect(bf.round).toBe(0);
    });

    it("maxRound는 V-1", () => {
      const bf = new BellmanFord(NODES, [], "A");
      expect(bf.maxRound).toBe(3);
    });
  });

  describe("relaxOnce (양수 가중치)", () => {
    const edges = [
      ["A", "B", 1],
      ["B", "C", 2],
      ["C", "D", 3],
    ];

    it("첫 라운드에서 B만 갱신", () => {
      const bf = new BellmanFord(NODES, edges, "A");
      const r = bf.relaxOnce();
      expect(r.done).toBe(false);
      expect(r.changed).toContain("B");
      expect(bf.dist.B).toBe(1);
    });

    it("V-1 라운드 후 모든 거리 확정", () => {
      const bf = new BellmanFord(NODES, edges, "A");
      bf.relaxOnce();
      bf.relaxOnce();
      bf.relaxOnce();
      expect(bf.dist.A).toBe(0);
      expect(bf.dist.B).toBe(1);
      expect(bf.dist.C).toBe(3);
      expect(bf.dist.D).toBe(6);
    });

    it("V-1 라운드 이후 호출 시 done=true", () => {
      const bf = new BellmanFord(NODES, edges, "A");
      bf.relaxOnce();
      bf.relaxOnce();
      bf.relaxOnce();
      const r = bf.relaxOnce();
      expect(r.done).toBe(true);
      expect(r.negativeCycle).toBe(false);
    });
  });

  describe("음수 가중치", () => {
    it("음수 가중치 경로를 올바르게 선택", () => {
      const edges = [
        ["A", "B", 5],
        ["A", "C", 2],
        ["C", "B", -4],
      ];
      const bf = new BellmanFord(NODES, edges, "A");
      bf.relaxOnce();
      bf.relaxOnce();
      bf.relaxOnce();
      expect(bf.dist.B).toBe(-2);
      expect(bf.prev.B).toBe("C");
    });
  });

  describe("음수 사이클 탐지", () => {
    it("음수 사이클이 있으면 V번째 호출에서 true", () => {
      const edges = [
        ["A", "B", 1],
        ["B", "C", -3],
        ["C", "B", 1],
      ];
      const bf = new BellmanFord(NODES, edges, "A");
      bf.relaxOnce();
      bf.relaxOnce();
      bf.relaxOnce();
      const r = bf.relaxOnce();
      expect(r.done).toBe(true);
      expect(r.negativeCycle).toBe(true);
    });

    it("음수 사이클이 없으면 false", () => {
      const edges = [
        ["A", "B", 1],
        ["B", "C", 2],
      ];
      const bf = new BellmanFord(NODES, edges, "A");
      bf.relaxOnce();
      bf.relaxOnce();
      bf.relaxOnce();
      const r = bf.relaxOnce();
      expect(r.negativeCycle).toBe(false);
    });
  });

  describe("reset", () => {
    it("reset 후 초기 상태로 복귀", () => {
      const bf = new BellmanFord(NODES, [["A", "B", 5]], "A");
      bf.relaxOnce();
      bf.reset();
      expect(bf.dist.B).toBe(Infinity);
      expect(bf.round).toBe(0);
    });
  });

  describe("getState", () => {
    it("방어적 복사본 반환", () => {
      const bf = new BellmanFord(NODES, [], "A");
      const s = bf.getState();
      s.dist.A = 999;
      expect(bf.dist.A).toBe(0);
    });
  });
});
