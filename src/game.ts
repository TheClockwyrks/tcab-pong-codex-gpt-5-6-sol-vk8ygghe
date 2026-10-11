import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";

export type Screen =
  "title" | "howto" | "countdown" | "playing" | "paused" | "matchover";
export type Mode = "solo" | "versus";
export type Side = "left" | "right";
export interface PaddleState {
  readonly cy: number;
  readonly vy: number;
  readonly driven: boolean;
  readonly drivenVy: number;
}
export interface AiState {
  readonly tracking: boolean;
  readonly movement: boolean;
}
export interface TrailSample {
  readonly x: number;
  readonly y: number;
  readonly t: number;
}
export interface BallState {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
  readonly spin: number;
  readonly held: boolean;
  readonly holdTimer: number;
  readonly serveSign: 1 | -1;
  readonly trail: readonly TrailSample[];
}
export interface ObstacleState {
  readonly index: number;
  readonly cx: number;
  readonly cy: number;
}
export interface CaromState {
  readonly screen: Screen;
  readonly mode: Mode;
  readonly menuIndex: number;
  readonly titleIndex: number;
  readonly resumeScreen: "countdown" | "playing";
  readonly score: { readonly p1: number; readonly p2: number };
  readonly winner: Side | null;
  readonly paddles: { readonly left: PaddleState; readonly right: PaddleState };
  readonly ai: AiState;
  readonly receiver: Side;
  readonly ball: BallState | null;
  readonly obstacles: readonly ObstacleState[];
  readonly simTime: number;
  readonly muted: boolean;
}
export interface Snapshot extends Omit<CaromState, "ball"> {
  readonly version: number;
  readonly ball: (BallState & { readonly speed: number }) | null;
}
export interface MenuRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
type R = DeepReadonly<CaromState>;
type Pose = (s: R) => CaromState;
export interface CaromDebugApi {
  readonly version: number;
  clearWorld: Pose;
  spawnBall: Pose;
  spawnObstacle(s: R, i: number): CaromState;
  reset: Pose;
  reconcile: Pose;
  setScreen(s: R, v: Screen): CaromState;
  setMode(s: R, v: Mode): CaromState;
  setMenuIndex(s: R, v: number): CaromState;
  setTitleIndex(s: R, v: number): CaromState;
  setResumeScreen(s: R, v: "countdown" | "playing"): CaromState;
  setScore(s: R, p1: number, p2: number): CaromState;
  setWinner(s: R, v: Side | null): CaromState;
  setReceiver(s: R, v: Side): CaromState;
  setPaddleCy(s: R, side: Side, v: number): CaromState;
  setPaddleVy(s: R, side: Side, v: number): CaromState;
  setPaddleDriven(s: R, side: Side, v: boolean): CaromState;
  setBallPosition(s: R, x: number, y: number): CaromState;
  setBallVelocity(s: R, x: number, y: number): CaromState;
  setBallSpin(s: R, v: number): CaromState;
  setBallHeld(s: R, v: boolean): CaromState;
  setBallHoldTimer(s: R, v: number): CaromState;
  setBallServeSign(s: R, v: 1 | -1): CaromState;
  drawBallServeSign: Pose;
  setAiTracking(s: R, v: boolean): CaromState;
  setAiMovement(s: R, v: boolean): CaromState;
  setMuted(s: R, v: boolean): CaromState;
  snapshot(s: R): Snapshot;
  menuItemRect(s: R, i: number): MenuRect | null;
}
export const BACKGROUND = "#070a16";
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sign = (): 1 | -1 => (Math.random() < 0.5 ? -1 : 1);
const ball = (): BallState => ({
  x: C.FIELD_CX,
  y: C.FIELD_CY,
  vx: 0,
  vy: 0,
  spin: 0,
  held: true,
  holdTimer: C.HOLD_TIME,
  serveSign: sign(),
  trail: [],
});
const obs = (i: number): ObstacleState => {
  const p = C.OBSTACLE_CENTERS[i];
  if (!p) throw new RangeError(`invalid obstacle ${i}`);
  return { index: i, cx: p.x, cy: p.y };
};
const copy = (s: R): CaromState => ({
  ...s,
  score: { ...s.score },
  paddles: { left: { ...s.paddles.left }, right: { ...s.paddles.right } },
  ai: { ...s.ai },
  ball: s.ball
    ? { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) }
    : null,
  obstacles: s.obstacles.map((o) => ({ ...o })),
});
const fresh = (muted = false): CaromState => ({
  screen: "title",
  mode: "solo",
  menuIndex: 0,
  titleIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  paddles: {
    left: { cy: C.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
    right: { cy: C.FIELD_CY, vy: 0, driven: false, drivenVy: 0 },
  },
  ai: { tracking: true, movement: true },
  receiver: "left",
  ball: ball(),
  obstacles: [obs(0), obs(1)],
  simTime: 0,
  muted,
});
const count = (x: Screen) =>
  x === "title" || x === "paused"
    ? 3
    : x === "matchover"
      ? 2
      : x === "howto"
        ? 1
        : 0;
const rect = (x: Screen, i: number): MenuRect | null => {
  if (i < 0 || i >= count(x)) return null;
  const w = x === "howto" ? 280 : 330,
    h = 58,
    y = x === "title" ? 350 : x === "howto" ? 594 : 390;
  return { x: C.FIELD_CX - w / 2, y: y + i * 76, w, h };
};
const at = (x: Screen, px: number, py: number) => {
  for (let i = 0; i < count(x); i++) {
    const r = rect(x, i);
    if (r && px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h)
      return i;
  }
  return null;
};
const title = (s: CaromState): CaromState => ({
  ...fresh(s.muted),
  titleIndex: s.titleIndex,
  menuIndex: s.titleIndex,
  simTime: s.simTime,
});
const start = (s: CaromState, mode: Mode): CaromState => ({
  ...s,
  screen: "countdown",
  mode,
  menuIndex: 0,
  resumeScreen: "playing",
  score: { p1: 0, p2: 0 },
  winner: null,
  receiver: "left",
  ball: ball(),
  paddles: {
    left: { ...s.paddles.left, cy: C.FIELD_CY, vy: 0 },
    right: { ...s.paddles.right, cy: C.FIELD_CY, vy: 0 },
  },
});
const confirm = (s: CaromState): CaromState => {
  if (s.screen === "title") {
    const n = { ...s, titleIndex: s.menuIndex };
    return s.menuIndex === 0
      ? start(n, "solo")
      : s.menuIndex === 1
        ? start(n, "versus")
        : { ...n, screen: "howto", menuIndex: 0 };
  }
  if (s.screen === "howto") return title(s);
  if (s.screen === "paused")
    return s.menuIndex === 0
      ? { ...s, screen: s.resumeScreen }
      : s.menuIndex === 1
        ? start(s, s.mode)
        : title(s);
  if (s.screen === "matchover")
    return s.menuIndex === 0 ? start(s, s.mode) : title(s);
  return s;
};
function input(old: R, a: UpdateApi): CaromState {
  let s = copy(old);
  if (a.input.pressed("mute")) a.audio.setMuted(!a.audio.muted());
  else if (a.audio.muted() !== s.muted) a.audio.setMuted(s.muted);
  s = { ...s, muted: a.audio.muted() };
  const screen = s.screen;
  if (screen === "countdown" || screen === "playing") {
    if (a.input.pressed("pause"))
      return { ...s, resumeScreen: screen, screen: "paused", menuIndex: 0 };
    return s;
  }
  if (screen === "paused") {
    if (a.input.pressed("pause") || a.input.pressed("back"))
      return { ...s, screen: s.resumeScreen };
  } else if (screen === "howto") {
    if (a.input.pressed("confirm") || a.input.pressed("back")) return title(s);
  } else if (screen === "matchover" && a.input.pressed("back")) return title(s);
  else if (screen === "title") a.input.pressed("back");
  const n = count(screen);
  if (!n) return s;
  const up = a.input.pressed("p1-up") || a.input.pressed("p2-up"),
    down = a.input.pressed("p1-down") || a.input.pressed("p2-down"),
    ok = a.input.pressed("confirm");
  if (up) s = { ...s, menuIndex: (s.menuIndex - 1 + n) % n };
  else if (down) s = { ...s, menuIndex: (s.menuIndex + 1) % n };
  else if (ok) return confirm(s);
  const p = a.input.pointer(),
    hover = at(screen, p.x, p.y);
  if (hover !== null) s = { ...s, menuIndex: hover };
  const downAt = new Map<number, number>();
  for (const e of a.input.pointerSamples()) {
    const i = at(screen, e.x, e.y);
    if (i !== null) s = { ...s, menuIndex: i };
    if (e.button === "primary" && e.type === "down" && i !== null)
      downAt.set(e.id, i);
    if (
      e.button === "primary" &&
      e.type === "up" &&
      i !== null &&
      downAt.get(e.id) === i
    )
      return confirm({ ...s, menuIndex: i });
  }
  return s;
}
const move = (p: PaddleState, vy: number, dt: number): PaddleState => {
  const raw = p.cy + vy * dt,
    n = clamp(raw, C.PADDLE_MIN_CY, C.PADDLE_MAX_CY);
  return { ...p, cy: n, vy: n !== raw && dt > 0 ? (n - p.cy) / dt : vy };
};
function paddles(s: CaromState, a: UpdateApi, dt: number): CaromState {
  const l = s.paddles.left,
    r = s.paddles.right,
    up = Math.max(a.input.value("p1-up"), a.input.value("p2-up")),
    dn = Math.max(a.input.value("p1-down"), a.input.value("p2-down"));
  const lv = l.driven
    ? l.drivenVy
    : (s.mode === "solo"
        ? dn - up
        : a.input.value("p1-down") - a.input.value("p1-up")) * C.PADDLE_SPEED;
  let rv = 0;
  if (r.driven) rv = r.drivenVy;
  else if (s.mode === "versus")
    rv = (a.input.value("p2-down") - a.input.value("p2-up")) * C.PADDLE_SPEED;
  else if (s.ai.movement) {
    let target = C.AI_HOME_Y,
      dz = C.AI_HOME_DEADZONE;
    if (s.ai.tracking && s.screen === "playing" && s.ball && s.ball.vx > 0) {
      target = s.ball.y - s.ball.vy * C.AI_REACT;
      dz = C.AI_DEADZONE;
    }
    const d = target - r.cy;
    if (Math.abs(d) > dz)
      rv = Math.sign(d) * Math.min(C.AI_SPEED, Math.abs(d) / dt);
  }
  return { ...s, paddles: { left: move(l, lv, dt), right: move(r, rv, dt) } };
}
type Face = "left" | "right" | "top" | "bottom";
const face = (b: BallState, r: C.Rect): Face | null => {
  if (
    b.x <= r.x0 - C.BALL_R ||
    b.x >= r.x1 + C.BALL_R ||
    b.y <= r.y0 - C.BALL_R ||
    b.y >= r.y1 + C.BALL_R
  )
    return null;
  const d: [Face, number][] = [
    ["left", b.x - r.x0 + C.BALL_R],
    ["right", r.x1 + C.BALL_R - b.x],
    ["top", b.y - r.y0 + C.BALL_R],
    ["bottom", r.y1 + C.BALL_R - b.y],
  ];
  return d.reduce((x, y) => (y[1] < x[1] ? y : x))[0];
};
const bounce = (b: BallState, r: C.Rect, f: Face): BallState =>
  f === "left"
    ? { ...b, x: r.x0 - C.BALL_R, vx: b.vx > 0 ? -b.vx : b.vx }
    : f === "right"
      ? { ...b, x: r.x1 + C.BALL_R, vx: b.vx < 0 ? -b.vx : b.vx }
      : f === "top"
        ? { ...b, y: r.y0 - C.BALL_R, vy: b.vy > 0 ? -b.vy : b.vy }
        : { ...b, y: r.y1 + C.BALL_R, vy: b.vy < 0 ? -b.vy : b.vy };
const paddleHit = (b: BallState, p: PaddleState, side: Side): BallState => {
  const theta = clamp((b.y - p.cy) / C.PADDLE_HALF, -1, 1) * C.MAX_BOUNCE_ANGLE,
    v = Math.min(Math.hypot(b.vx, b.vy) * C.SPEED_MULT, C.SPEED_CAP);
  return {
    ...b,
    x: side === "left" ? C.P1_X1 + C.BALL_R : C.P2_X0 - C.BALL_R,
    vx: (side === "left" ? 1 : -1) * v * Math.cos(theta),
    vy: v * Math.sin(theta),
    spin: clamp(
      b.spin + p.vy * C.SPIN_FROM_PADDLE,
      -C.SPIN_CLAMP,
      C.SPIN_CLAMP,
    ),
  };
};
function physics(s: CaromState, a: UpdateApi, dt: number): CaromState {
  if (!s.ball) return s;
  let b: BallState = {
    ...s.ball,
    trail: s.ball.trail.map((x) => ({ ...x })),
  };
  let ph = false,
    wh = false,
    oh = false;
  const n = Math.max(
      1,
      Math.ceil((Math.hypot(b.vx, b.vy) * dt) / C.MAX_SUBSTEP),
    ),
    h = dt / n;
  for (let k = 0; k < n; k++) {
    const v = Math.hypot(b.vx, b.vy);
    if (v) {
      const q = (b.spin / v) * h,
        co = Math.cos(q),
        si = Math.sin(q),
        vx = b.vx * co - b.vy * si,
        vy = b.vx * si + b.vy * co;
      b = { ...b, vx, vy };
    }
    b = {
      ...b,
      spin: b.spin * 0.5 ** (h / C.SPIN_HALFLIFE),
      x: b.x + b.vx * h,
      y: b.y + b.vy * h,
    };
    if (b.y - C.BALL_R < 0 && b.vy < 0) {
      b = { ...b, y: C.BALL_R, vy: -b.vy };
      wh = true;
    } else if (b.y + C.BALL_R > C.FIELD_H && b.vy > 0) {
      b = { ...b, y: C.FIELD_H - C.BALL_R, vy: -b.vy };
      wh = true;
    }
    const ps: [Side, C.Rect, PaddleState][] = [
      [
        "left",
        {
          x0: C.P1_X0,
          x1: C.P1_X1,
          y0: s.paddles.left.cy - C.PADDLE_HALF,
          y1: s.paddles.left.cy + C.PADDLE_HALF,
        },
        s.paddles.left,
      ],
      [
        "right",
        {
          x0: C.P2_X0,
          x1: C.P2_X1,
          y0: s.paddles.right.cy - C.PADDLE_HALF,
          y1: s.paddles.right.cy + C.PADDLE_HALF,
        },
        s.paddles.right,
      ],
    ];
    for (const [side, r, p] of ps) {
      const f = face(b, r);
      if (f) {
        if (f === "left" || f === "right") {
          b = paddleHit(b, p, side);
          ph = true;
        } else {
          b = bounce(b, r, f);
          wh = true;
        }
      }
    }
    for (const o of s.obstacles) {
      const r = {
          x0: o.cx - C.OBSTACLE_HW,
          x1: o.cx + C.OBSTACLE_HW,
          y0: o.cy - C.OBSTACLE_HH,
          y1: o.cy + C.OBSTACLE_HH,
        },
        f = face(b, r);
      if (f) {
        b = bounce(b, r, f);
        oh = true;
      }
    }
  }
  if (ph) a.audio.play(C.CUES.paddleHit);
  if (wh) a.audio.play(C.CUES.wallBounce);
  if (oh) a.audio.play(C.CUES.obstacleBounce);
  if (b.x - C.BALL_R > C.FIELD_W || b.x + C.BALL_R < 0) {
    a.audio.play(C.CUES.score);
    const win: Side = b.x > C.FIELD_W ? "left" : "right",
      score = {
        p1: s.score.p1 + (win === "left" ? 1 : 0),
        p2: s.score.p2 + (win === "right" ? 1 : 0),
      },
      won =
        win === "left"
          ? score.p1 >= C.WIN_SCORE && score.p1 - score.p2 >= C.WIN_LEAD
          : score.p2 >= C.WIN_SCORE && score.p2 - score.p1 >= C.WIN_LEAD;
    return won
      ? { ...s, ball: b, score, winner: win, screen: "matchover", menuIndex: 0 }
      : {
          ...s,
          score,
          receiver: win === "left" ? "right" : "left",
          ball: ball(),
          screen: "countdown",
        };
  }
  return { ...s, ball: b };
}
function advance(s: CaromState, a: UpdateApi, dt: number) {
  if (s.screen !== "countdown" && s.screen !== "playing") return s;
  let n = paddles(s, a, dt);
  if (n.screen === "countdown" && n.ball) {
    const t = n.ball.holdTimer - dt;
    if (t <= 0) {
      const d = n.receiver === "left" ? -1 : 1;
      n = {
        ...n,
        screen: "playing",
        ball: {
          ...n.ball,
          held: false,
          holdTimer: 0,
          vx: d * C.SERVE_SPEED * Math.cos(C.SERVE_ANGLE),
          vy: n.ball.serveSign * C.SERVE_SPEED * Math.sin(C.SERVE_ANGLE),
          trail: [],
        },
      };
    } else n = { ...n, ball: { ...n.ball, holdTimer: t } };
  } else if (n.screen === "playing" && n.ball && !n.ball.held)
    n = physics(n, a, dt);
  if (n.ball)
    n = {
      ...n,
      ball: {
        ...n.ball,
        trail: [
          ...n.ball.trail,
          { x: n.ball.x, y: n.ball.y, t: n.simTime },
        ].filter((p) => p.t >= n.simTime - C.TRAIL_TIME),
      },
    };
  return n;
}
const need = (s: R) => {
  if (!s.ball) throw new Error("Carom: no ball is present");
  return { ...s.ball, trail: s.ball.trail.map((p) => ({ ...p })) };
};
const wp = (s: R, side: Side, p: Partial<PaddleState>): CaromState => {
  const n = copy(s);
  return {
    ...n,
    paddles: { ...n.paddles, [side]: { ...n.paddles[side], ...p } },
  };
};
const wb = (s: R, p: Partial<BallState>): CaromState => ({
  ...copy(s),
  ball: { ...need(s), ...p },
});
const debug: CaromDebugApi = {
  version: C.CAROM_DEBUG_VERSION,
  clearWorld: (s) => ({ ...copy(s), ball: null, obstacles: [] }),
  spawnBall: (s) => ({ ...copy(s), ball: ball() }),
  spawnObstacle: (s, i) => {
    const n = copy(s);
    return {
      ...n,
      obstacles: [...n.obstacles.filter((o) => o.index !== i), obs(i)].sort(
        (a, b) => a.index - b.index,
      ),
    };
  },
  reset: (s) => fresh(s.muted),
  reconcile: copy,
  setScreen: (s, screen) => ({ ...copy(s), screen }),
  setMode: (s, mode) => ({ ...copy(s), mode }),
  setMenuIndex: (s, menuIndex) => ({ ...copy(s), menuIndex }),
  setTitleIndex: (s, titleIndex) => ({ ...copy(s), titleIndex }),
  setResumeScreen: (s, resumeScreen) => ({ ...copy(s), resumeScreen }),
  setScore: (s, p1, p2) => ({ ...copy(s), score: { p1, p2 } }),
  setWinner: (s, winner) => ({ ...copy(s), winner }),
  setReceiver: (s, receiver) => ({ ...copy(s), receiver }),
  setPaddleCy: (s, x, cy) => wp(s, x, { cy }),
  setPaddleVy: (s, x, drivenVy) => wp(s, x, { drivenVy }),
  setPaddleDriven: (s, x, driven) => wp(s, x, { driven }),
  setBallPosition: (s, x, y) => wb(s, { x, y }),
  setBallVelocity: (s, vx, vy) => wb(s, { vx, vy }),
  setBallSpin: (s, spin) => wb(s, { spin }),
  setBallHeld: (s, held) => wb(s, { held }),
  setBallHoldTimer: (s, holdTimer) => wb(s, { holdTimer }),
  setBallServeSign: (s, serveSign) => wb(s, { serveSign }),
  drawBallServeSign: (s) => wb(s, { serveSign: sign() }),
  setAiTracking: (s, tracking) => ({ ...copy(s), ai: { ...s.ai, tracking } }),
  setAiMovement: (s, movement) => ({ ...copy(s), ai: { ...s.ai, movement } }),
  setMuted: (s, muted) => ({ ...copy(s), muted }),
  snapshot: (s) => {
    const n = copy(s);
    return {
      ...n,
      version: C.CAROM_DEBUG_VERSION,
      ball: n.ball
        ? { ...n.ball, speed: Math.hypot(n.ball.vx, n.ball.vy) }
        : null,
    };
  },
  menuItemRect: (s, i) => rect(s.screen, i),
};
const txt = (
  x: CanvasRenderingContext2D,
  v: string,
  px: number,
  py: number,
  z: number,
  c = "#e9efff",
) => {
  x.fillStyle = c;
  x.font = `700 ${z}px system-ui,sans-serif`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(v, px, py);
};
const rr = (
  x: CanvasRenderingContext2D,
  a: number,
  b: number,
  w: number,
  h: number,
  r: number,
) => {
  x.beginPath();
  x.roundRect(a, b, w, h, r);
  x.fill();
};
function field(s: R, x: CanvasRenderingContext2D) {
  x.save();
  x.strokeStyle = "rgba(114,140,190,.25)";
  x.setLineDash([12, 20]);
  x.beginPath();
  x.moveTo(C.NET_X, 28);
  x.lineTo(C.NET_X, C.FIELD_H - 28);
  x.stroke();
  x.setLineDash([]);
  x.fillStyle = "#36e7ff";
  x.shadowColor = x.fillStyle;
  x.shadowBlur = 18;
  rr(x, C.P1_X0, s.paddles.left.cy - C.PADDLE_HALF, C.PADDLE_W, C.PADDLE_H, 8);
  x.fillStyle = "#ff4fbc";
  x.shadowColor = x.fillStyle;
  rr(x, C.P2_X0, s.paddles.right.cy - C.PADDLE_HALF, C.PADDLE_W, C.PADDLE_H, 8);
  x.fillStyle = "#ffb547";
  x.shadowColor = x.fillStyle;
  for (const o of s.obstacles)
    rr(
      x,
      o.cx - C.OBSTACLE_HW,
      o.cy - C.OBSTACLE_HH,
      C.OBSTACLE_W,
      C.OBSTACLE_H,
      10,
    );
  if (s.ball) {
    x.shadowBlur = 0;
    s.ball.trail.forEach((p, i) => {
      x.globalAlpha = ((i + 1) / s.ball!.trail.length) * 0.35;
      x.fillStyle = "#fff";
      x.beginPath();
      x.arc(
        p.x,
        p.y,
        (C.BALL_R * (i + 1)) / s.ball!.trail.length,
        0,
        Math.PI * 2,
      );
      x.fill();
    });
    x.globalAlpha = 1;
    x.shadowBlur = 20;
    x.shadowColor = "#fff";
    x.beginPath();
    x.arc(s.ball.x, s.ball.y, C.BALL_R, 0, Math.PI * 2);
    x.fill();
  }
  x.restore();
}
function menu(s: R, x: CanvasRenderingContext2D, items: readonly string[]) {
  items.forEach((v, i) => {
    const q = rect(s.screen, i);
    if (!q) return;
    const on = i === s.menuIndex;
    x.fillStyle = on ? "rgba(54,231,255,.16)" : "rgba(8,13,30,.82)";
    x.strokeStyle = on ? "#36e7ff" : "#34405b";
    x.beginPath();
    x.roundRect(q.x, q.y, q.w, q.h, 14);
    x.fill();
    x.stroke();
    txt(x, v, C.FIELD_CX, q.y + q.h / 2, 22, on ? "#fff" : "#aebbd5");
  });
}
export const game: Game<CaromState, CaromDebugApi> = {
  initialize(a: InitApi<CaromState>) {
    for (const v of C.ACTIONS)
      a.input.register(v, { keys: [...C.BINDINGS[v]] });
    a.audio.define(C.CUES.paddleHit, {
      wave: "square",
      freq: 260,
      freqTo: 520,
      durationMs: 55,
    });
    a.audio.define(C.CUES.wallBounce, {
      wave: "triangle",
      freq: 360,
      durationMs: 45,
    });
    a.audio.define(C.CUES.obstacleBounce, {
      wave: "sawtooth",
      freq: 180,
      durationMs: 65,
    });
    a.audio.define(C.CUES.score, { freq: 420, freqTo: 820, durationMs: 180 });
    const d = (n: string, f: (s: R) => string | number) =>
      a.diagnostics.register(n, f);
    d("screen", (s) => s.screen);
    d("mode", (s) => s.mode);
    d("score", (s) => `${s.score.p1}-${s.score.p2}`);
    d("ball pos", (s) =>
      s.ball ? `${s.ball.x.toFixed(1)},${s.ball.y.toFixed(1)}` : "none",
    );
    d("ball vel", (s) =>
      s.ball ? `${s.ball.vx.toFixed(1)},${s.ball.vy.toFixed(1)}` : "none",
    );
    d("ball speed", (s) =>
      s.ball ? Math.hypot(s.ball.vx, s.ball.vy).toFixed(1) : "none",
    );
    d("ball spin", (s) => s.ball?.spin.toFixed(1) ?? "none");
    d("left paddle", (s) => `${s.paddles.left.cy},${s.paddles.left.vy}`);
    d("right paddle", (s) => `${s.paddles.right.cy},${s.paddles.right.vy}`);
    return [fresh(), debug];
  },
  update(s, a, dt) {
    const n = input({ ...copy(s), simTime: s.simTime + dt }, a);
    return advance(n, a, dt);
  },
  render(s, a: RenderApi) {
    const x = a.ctx;
    field(s, x);
    if (s.screen === "playing" || s.screen === "countdown") {
      txt(x, String(s.score.p1), C.FIELD_CX - 96, 68, 52, "#36e7ff");
      txt(x, String(s.score.p2), C.FIELD_CX + 96, 68, 52, "#ff4fbc");
      txt(
        x,
        s.mode === "solo" ? "SOLO CIRCUIT" : "LOCAL VERSUS",
        C.FIELD_CX,
        112,
        15,
        "#7e8ca9",
      );
    }
    if (s.screen === "countdown" && s.ball)
      txt(
        x,
        String(Math.max(1, Math.ceil(s.ball.holdTimer))),
        C.FIELD_CX,
        C.FIELD_CY - 70,
        42,
      );
    if (s.screen === "title") {
      x.fillStyle = "rgba(7,10,22,.7)";
      x.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      txt(x, C.TITLE_TEXT, C.FIELD_CX, 178, 94);
      txt(x, "SPIN THE ANGLE", C.FIELD_CX, 254, 17, "#ffb547");
      menu(s, x, C.TITLE_ITEMS);
    } else if (s.screen === "howto") {
      x.fillStyle = "rgba(7,10,22,.94)";
      x.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      txt(x, "HOW TO PLAY", C.FIELD_CX, 90, 46);
      txt(x, "W / S — LEFT PADDLE", 360, 205, 22, "#36e7ff");
      txt(x, "↑ / ↓ — RIGHT PADDLE", 920, 205, 22, "#ff4fbc");
      txt(
        x,
        "Move as you strike to bend the ball with spin.",
        C.FIELD_CX,
        324,
        23,
      );
      txt(
        x,
        "Bank around the obstacles. First to 11, win by 2.",
        C.FIELD_CX,
        372,
        20,
        "#b9c5dc",
      );
      txt(x, "P / ESC pause  •  M mute", C.FIELD_CX, 450, 17, "#7e8ca9");
      menu(s, x, ["BACK"]);
    } else if (s.screen === "paused") {
      x.fillStyle = "rgba(7,10,22,.76)";
      x.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      txt(x, "PAUSED", C.FIELD_CX, 245, 52);
      menu(s, x, C.PAUSE_ITEMS);
    } else if (s.screen === "matchover") {
      x.fillStyle = "rgba(7,10,22,.82)";
      x.fillRect(0, 0, C.FIELD_W, C.FIELD_H);
      txt(
        x,
        s.winner === "left" ? "LEFT SIDE WINS" : "RIGHT SIDE WINS",
        C.FIELD_CX,
        205,
        48,
        s.winner === "left" ? "#36e7ff" : "#ff4fbc",
      );
      txt(x, `${s.score.p1} — ${s.score.p2}`, C.FIELD_CX, 292, 42);
      menu(s, x, C.MATCHOVER_ITEMS);
    }
    if (s.muted) txt(x, "MUTED", C.FIELD_W - 64, 28, 12, "#7e8ca9");
  },
};
