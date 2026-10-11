import { describe, expect, it } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import {
  BALL_R,
  FIELD_CX,
  FIELD_CY,
  FIELD_W,
  HOLD_TIME,
  SERVE_SPEED,
} from "./constants";
import { game, type CaromDebugApi, type CaromState } from "./game";

function harness() {
  const values = new Map<string, number>();
  let muted = false;
  const cues: string[] = [];
  const init = {
    input: { register: () => undefined, layout: () => null },
    audio: { define: () => undefined, load: async () => undefined },
    diagnostics: { register: () => undefined },
    assets: {},
    events: {},
    viewport: () => ({}),
  } as unknown as InitApi<CaromState>;
  const [state, debug] = game.initialize(init) as [CaromState, CaromDebugApi];
  const api = {
    input: {
      value: (name: string) => values.get(name) ?? 0,
      pressed: () => false,
      pointer: () => ({
        x: 0,
        y: 0,
        down: false,
        device: "mouse",
        buttons: [],
      }),
      pointerPressed: () => false,
      pointerReleased: () => false,
      pointerSamples: () => [],
      pointerContacts: () => [],
      wheel: () => ({ x: 0, y: 0 }),
    },
    audio: {
      play: (cue: string) => cues.push(cue),
      setMuted: (value: boolean) => {
        muted = value;
      },
      muted: () => muted,
      loop: () => undefined,
      stop: () => undefined,
      looping: () => false,
    },
    frame: () => ({ count: 0, timeMs: 0, deltaMs: 0 }),
    viewport: () => ({}),
  } as unknown as UpdateApi;
  return { state, debug, api, values, cues };
}

describe("Carom simulation", () => {
  it("initializes the complete title world and snapshot", () => {
    const { state, debug } = harness();
    const snap = debug.snapshot(state);
    expect(snap.screen).toBe("title");
    expect(snap.ball).toMatchObject({
      x: FIELD_CX,
      y: FIELD_CY,
      speed: 0,
      held: true,
      holdTimer: HOLD_TIME,
    });
    expect(snap.obstacles.map((o) => o.index)).toEqual([0, 1]);
    expect(snap.version).toBe(1);
  });

  it("serves toward the receiver when countdown expires", () => {
    const { state, debug, api } = harness();
    let posed = debug.setScreen(state, "countdown");
    posed = debug.setBallServeSign(posed, -1);
    posed = debug.setBallHoldTimer(posed, 0.005);
    const next = game.update(posed, api, 0.01);
    expect(next.screen).toBe("playing");
    expect(next.ball?.held).toBe(false);
    expect(next.ball?.vx).toBeLessThan(0);
    expect(next.ball?.vy).toBeLessThan(0);
    expect(Math.hypot(next.ball?.vx ?? 0, next.ball?.vy ?? 0)).toBeCloseTo(
      SERVE_SPEED,
    );
  });

  it("reflects from the top wall without changing speed", () => {
    const { state, debug, api, cues } = harness();
    let posed = debug.setScreen(state, "playing");
    posed = debug.setBallHeld(posed, false);
    posed = debug.setBallPosition(posed, 300, BALL_R + 1);
    posed = debug.setBallVelocity(posed, 200, -300);
    const before = Math.hypot(200, 300);
    const next = game.update(posed, api, 0.02);
    expect(next.ball?.vy).toBeGreaterThan(0);
    expect(Math.hypot(next.ball?.vx ?? 0, next.ball?.vy ?? 0)).toBeCloseTo(
      before,
      6,
    );
    expect(cues).toContain("wall-bounce");
  });

  it("scores and parks a fresh ball", () => {
    const { state, debug, api, cues } = harness();
    let posed = debug.setScreen(state, "playing");
    posed = debug.setBallHeld(posed, false);
    posed = debug.setBallPosition(posed, FIELD_W + BALL_R + 1, 100);
    posed = debug.setBallVelocity(posed, 100, 0);
    const next = game.update(posed, api, 0.01);
    expect(next.score).toEqual({ p1: 1, p2: 0 });
    expect(next.receiver).toBe("right");
    expect(next.screen).toBe("countdown");
    expect(next.ball).toMatchObject({ x: FIELD_CX, y: FIELD_CY, held: true });
    expect(cues).toContain("score");
  });

  it("moves and clamps a debug-driven paddle", () => {
    const { state, debug, api } = harness();
    let posed = debug.setScreen(state, "playing");
    posed = debug.setPaddleDriven(posed, "left", true);
    posed = debug.setPaddleVy(posed, "left", -1000);
    const next = game.update(posed, api, 1);
    expect(next.paddles.left.cy).toBe(55);
    expect(next.paddles.left.vy).toBe(-305);
  });

  it("clear, spawn, and absent-ball failures are explicit", () => {
    const { state, debug } = harness();
    const empty = debug.clearWorld(state);
    expect(debug.snapshot(empty).ball).toBeNull();
    expect(() => debug.setBallSpin(empty, 5)).toThrow("no ball");
    const restored = debug.spawnObstacle(debug.spawnBall(empty), 1);
    expect(restored.ball).not.toBeNull();
    expect(restored.obstacles).toHaveLength(1);
  });
});
