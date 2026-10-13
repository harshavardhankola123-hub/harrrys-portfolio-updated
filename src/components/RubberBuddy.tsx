"use client";

import { useEffect, useRef } from "react";
import { cancelFrame, frame, useReducedMotion } from "framer-motion";

const DIR = "/images/hero-runner";
const IDLE = 0;
const RUN = [1, 2, 3, 4, 5, 6, 7, 8];
const JUMP = [9, 10, 11, 12, 13];
const FRAMES = ["idle", ...RUN.map((_, i) => `run_${i}`), ...JUMP.map((_, i) => `jump_${i}`)].map((n) => `${DIR}/${n}.png`);

/* Sprites are 128×160 with the feet on y=152 */
const SPRITE_W = 128;
const SPRITE_H = 160;
const FOOT_Y = 152;

type Pt = { x: number; y: number };

/* Where the rubber limbs grow from, in sprite pixels */
export const HAND_LEFT: Pt = { x: 44, y: 82 }; // standing pose, hand on the viewer's left
export const HAND_RIGHT: Pt = { x: 86, y: 80 }; // standing pose, hand on the viewer's right
export const FLY_FIST: Pt = { x: 119, y: 37 }; // mid-air pose, the fist thrown forward
const FLY_FOOT: Pt = { x: 8, y: 140 }; // mid-air pose, the trailing foot
export const FLY_ARM_ANGLE = -25; // degrees the thrown arm points at in the mid-air pose

export const SKIN = "#f6c08f";
export const OUTLINE = "#6b3418";
const SOLE = "#3a2413";

/* Text he plays on, and places he stays out of */
const TEXTS = "h2, h3, [data-buddy]";
const SKIP = "#hero, [data-buddy='off']";

/* How the text gives way under him: [offset, scaleX, scaleY] around his contact point */
const REACTIONS = {
  bounce: { duration: 480, shape: [[0, 1, 1], [0.18, 1.02, 0.9], [0.5, 0.99, 1.05], [0.75, 1, 0.985], [1, 1, 1]] },
  stomp: { duration: 640, shape: [[0, 1, 1], [0.12, 1.05, 0.76], [0.4, 0.98, 1.1], [0.62, 1.01, 0.96], [0.82, 1, 1.02], [1, 1, 1]] },
  pull: { duration: 920, shape: [[0, 1, 1], [0.46, 0.88, 1], [0.6, 1.07, 1], [0.74, 0.97, 1], [0.87, 1.015, 1], [1, 1, 1]] },
  tug: { duration: 240, shape: [[0, 1, 1], [0.4, 1.03, 1.04], [1, 1, 1]] },
} as const;

type Seg = { x1: number; x2: number; top: number };
/* The top edge of an element's first line of text, in the element's own unscaled pixels */
type Surface = {
  el: HTMLElement;
  segs: Seg[];
  x1: number;
  x2: number;
  size: number;
  y: number; // last seen viewport y of the surface
  stamp: number; // when it was last measured
  left: number; // when he last stood on it
};

type Dest = { surface: Surface | null; rel: number; sky: Pt };
type Mode =
  | { kind: "away" }
  | { kind: "perch" }
  | { kind: "reach"; dest: Dest; t: number; dur: number; tugged: boolean }
  | { kind: "fly"; dest: Dest; t: number; dur: number; from: Pt }
  | { kind: "land"; t: number };
type Action =
  | { kind: "idle"; t: number; dur: number }
  | { kind: "run"; t: number; dur: number; from: number; to: number }
  | { kind: "hop"; t: number; dur: number }
  | { kind: "pull"; t: number; dur: number; far: number; fired: boolean }
  | { kind: "stomp"; t: number; dur: number; spot: number; fired: boolean };
type Limb = { kind: "arm" | "leg"; from: Pt; to: Pt; amp: number };

const DECK = ["run", "pull", "hop", "stomp", "run", "zip"] as const;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mix = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeIn = (t: number) => t * t * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/* ─── The rubber boy follows the scroll: he stretches an arm to the next piece of text,
       slingshots onto it, then runs, pulls and stomps on it until the page moves on ─── */
export function RubberBuddy() {
  const reduceMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLImageElement>(null);
  const limbRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const wrap = wrapRef.current;
    const body = bodyRef.current;
    const limbEl = limbRef.current;
    const ctx = document.createElement("canvas").getContext("2d");
    if (!wrap || !body || !limbEl || !ctx) return;
    const sprites = Array.from(body.querySelectorAll("img"));
    const [limbOutline, limbSkin] = Array.from(limbEl.querySelectorAll("path"));
    const limbEnd = limbEl.querySelector<SVGGElement>("[data-end]");
    const fist = limbEl.querySelector<SVGCircleElement>("[data-fist]");
    const foot = limbEl.querySelector<SVGGElement>("[data-foot]");
    const footSkin = foot?.querySelector("ellipse");
    const footSole = foot?.querySelector("line");
    if (!limbEnd || !fist || !foot || !footSkin || !footSole) return;
    const range = document.createRange();

    let vw = window.innerWidth;
    let vh = window.innerHeight;
    let charH = 72;
    let charW = charH * (SPRITE_W / SPRITE_H);
    let unit = charH / SPRITE_H;

    // Pose
    let x = vw / 2;
    let y = -200;
    let facing = 1;
    let rotate = 0;
    let sx = 1;
    let sy = 1;
    let shown = -1;
    let limb: Limb | null = null;

    // Behaviour
    let time = 0;
    let mode: Mode = { kind: "away" };
    let action: Action = { kind: "idle", t: 0, dur: 0.4 };
    let perch: Surface | null = null;
    let rel = 0;
    let smoothTop = 0;
    let actions = 0;
    let deck = 0;
    let want: Surface | "sky" | null = null;
    let options: Surface[] = [];
    let list: HTMLElement[] = [];
    let listStamp = -10;
    let heroTitle: HTMLElement | null = null;
    let planTimer = 0;
    let scrollDir = 1;
    let lastScroll = window.scrollY;
    const surfaces = new Map<HTMLElement, Surface>();

    const resize = () => {
      vw = window.innerWidth;
      vh = window.innerHeight;
      charH = clamp(vw * 0.05 + 24, 52, 88);
      charW = charH * (SPRITE_W / SPRITE_H);
      unit = charH / SPRITE_H;
      wrap.style.width = `${charW}px`;
      wrap.style.height = `${charH}px`;
      const arm = charH * 0.085;
      limbOutline.setAttribute("stroke-width", `${arm + Math.max(2.5, charH * 0.035)}`);
      limbSkin.setAttribute("stroke-width", `${arm}`);
      fist.setAttribute("r", `${arm * 0.95}`);
      fist.setAttribute("stroke-width", `${Math.max(1.25, charH * 0.018)}`);
      footSkin.setAttribute("rx", `${arm * 0.8}`);
      footSkin.setAttribute("ry", `${arm * 1.45}`);
      footSkin.setAttribute("stroke-width", `${Math.max(1.25, charH * 0.018)}`);
      footSole.setAttribute("x1", `${arm * 0.85}`);
      footSole.setAttribute("x2", `${arm * 0.85}`);
      footSole.setAttribute("y1", `${-arm * 1.45}`);
      footSole.setAttribute("y2", `${arm * 1.45}`);
      footSole.setAttribute("stroke-width", `${arm * 0.5}`);
      surfaces.forEach((s) => (s.stamp = -10));
    };

    /* ── Reading the text ── */

    const scaleOf = (el: HTMLElement, box: DOMRect) => ({
      kx: box.width / (el.offsetWidth || 1) || 1,
      ky: box.height / (el.offsetHeight || 1) || 1,
    });

    // Trace the tops of the letters on the element's first line
    const measure = (s: Surface) => {
      const el = s.el;
      const box = el.getBoundingClientRect();
      const { kx, ky } = scaleOf(el, box);
      const segs: Seg[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let lineTop: number | null = null;
      let lastRight = 0;
      let size = 0;
      scan: for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const parent = node.parentElement;
        const text = node.nodeValue ?? "";
        if (!parent || !text.trim()) continue;
        const style = getComputedStyle(parent);
        if (style.visibility === "hidden") continue;
        const fontSize = parseFloat(style.fontSize);
        ctx.font = `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
        const upper = style.textTransform === "uppercase";
        const font = ctx.measureText("Hx");
        const contentHeight = font.fontBoundingBoxAscent + font.fontBoundingBoxDescent || fontSize * 1.2;
        const xHeight = ctx.measureText("x").actualBoundingBoxAscent;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (!char.trim()) continue;
          range.setStart(node, i);
          range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect();
          if (r.width === 0) continue;
          if (lineTop === null) lineTop = r.top;
          else if (Math.abs(r.top - lineTop) > fontSize * ky * 0.6) break scan;
          if (segs.length > 0 && r.left - lastRight > fontSize * kx * 1.5) break scan;
          // Punctuation would leave holes to fall into, so nothing sits lower than the x-height
          const ascent = Math.max(xHeight, ctx.measureText(upper ? char.toUpperCase() : char).actualBoundingBoxAscent);
          const top = r.top + (font.fontBoundingBoxAscent - ascent) * (r.height / contentHeight);
          segs.push({ x1: (r.left - box.left) / kx, x2: (r.right - box.left) / kx, top: (top - box.top) / ky });
          lastRight = r.right;
          size = Math.max(size, fontSize);
        }
      }
      s.stamp = time;
      if (segs.length === 0) return false;
      s.segs = segs;
      s.x1 = segs[0].x1;
      s.x2 = segs[segs.length - 1].x2;
      s.size = size;
      return true;
    };

    const topAt = (s: Surface, at: number) => {
      let prev: Seg | null = null;
      for (const seg of s.segs) {
        if (at < seg.x1) {
          if (!prev) return seg.top;
          return lerp(prev.top, seg.top, (at - prev.x2) / (seg.x1 - prev.x2 || 1));
        }
        if (at <= seg.x2) return seg.top;
        prev = seg;
      }
      return prev ? prev.top : 0;
    };

    // A point on the element, in viewport pixels — follows scroll and any squash the text is going through
    const place = (s: Surface, at: number, top: number): Pt => {
      const box = s.el.getBoundingClientRect();
      const { kx, ky } = scaleOf(s.el, box);
      return { x: box.left + at * kx, y: box.top + top * ky };
    };
    const onTop = (s: Surface, at: number) => place(s, at, topAt(s, at));

    // Where on the line he can stand without hanging off the text or the screen
    const standRange = (s: Surface) => {
      const box = s.el.getBoundingClientRect();
      const { kx } = scaleOf(s.el, box);
      const pad = charW * 0.35;
      let lo = Math.max(s.x1 + pad, (charW * 0.7 - box.left) / kx);
      let hi = Math.min(s.x2 - pad, (vw - charW * 0.7 - box.left) / kx);
      if (lo > hi) lo = hi = clamp((s.x1 + s.x2) / 2, Math.min(lo, hi), Math.max(lo, hi));
      return { lo, hi, box, kx };
    };

    const eligible = (s: Surface) => {
      const el = s.el;
      if (!el.isConnected) return false;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.bottom < 0 || box.top > vh) return false;
      if (el.checkVisibility && !el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      if (time - s.stamp > 1 && !measure(s)) return false;
      if (s.segs.length === 0 || s.size < 18 || s.x2 - s.x1 < charW * 1.1) return false;
      const mid = (s.x1 + s.x2) / 2;
      s.y = onTop(s, mid).y;
      if (s.y < charH * 1.15 + 16 || s.y > vh - 28) return false;
      return place(s, s.x2, 0).x > charW * 1.5 && place(s, s.x1, 0).x < vw - charW * 1.5;
    };

    // Decide which piece of text he should be on
    const plan = () => {
      if (time - listStamp > 1.5) {
        list = Array.from(document.querySelectorAll<HTMLElement>(TEXTS)).filter((el) => !el.closest(SKIP));
        listStamp = time;
      }
      // The hero remounts once the envelope opens, so never hold on to a stale title
      if (!heroTitle?.isConnected) heroTitle = document.querySelector<HTMLElement>("#hero h1");
      options = [];
      // The hero has its own runner on the name — stay out while it is on screen
      if (heroTitle && heroTitle.getBoundingClientRect().bottom > vh * 0.3) {
        want = "sky";
        return;
      }
      let best: Surface | null = null;
      let bestScore = Infinity;
      for (const el of list) {
        let s = surfaces.get(el);
        if (!s) {
          s = { el, segs: [], x1: 0, x2: 0, size: 0, y: 0, stamp: -10, left: -10 };
          surfaces.set(el, s);
        }
        if (!eligible(s)) continue;
        options.push(s);
        let score = Math.abs(s.y - vh * 0.42);
        if (s === perch) score -= vh * 0.28;
        else score += Math.max(0, 5 - (time - s.left)) * vh * 0.08;
        if (score < bestScore) {
          bestScore = score;
          best = s;
        }
      }
      want = best;
    };

    /* ── Drawing ── */

    const show = (index: number) => {
      if (index === shown) return;
      if (shown >= 0) sprites[shown].style.opacity = "0";
      sprites[index].style.opacity = "1";
      shown = index;
    };

    // A sprite pixel in viewport space, under the current pose
    const anchor = (a: Pt): Pt => {
      const dx = (a.x - SPRITE_W / 2) * unit * sx;
      const dy = (a.y - FOOT_Y) * unit * sy;
      const r = (rotate * Math.PI) / 180;
      return { x: x + (dx * Math.cos(r) - dy * Math.sin(r)) * facing, y: y + dx * Math.sin(r) + dy * Math.cos(r) };
    };
    const handToward = (dir: number) => anchor(dir * facing > 0 ? HAND_RIGHT : HAND_LEFT);

    const puff = (at: Pt) => {
      const dust = dustRef.current;
      if (!dust) return;
      dust.style.left = `${at.x - charW * 0.6}px`;
      dust.style.top = `${at.y - charH * 0.4}px`;
      dust.style.width = `${charW * 1.2}px`;
      dust.animate(
        [
          { opacity: 0.85, transform: "scale(0.6)" },
          { opacity: 0, transform: "scale(1.35)" },
        ],
        { duration: 480, easing: "ease-out" }
      );
    };

    // Squash and stretch the text itself, around the spot he touched
    const react = (s: Surface, kind: keyof typeof REACTIONS, at: number) => {
      const el = s.el;
      const oy = el.offsetHeight;
      const { duration, shape } = REACTIONS[kind];
      const keyframes = shape.map(([offset, a, b]) => ({
        offset,
        easing: "ease-out",
        transform: `translate(${at}px, ${oy}px) scale(${a}, ${b}) translate(${-at}px, ${-oy}px)`,
      }));
      try {
        el.animate(keyframes, { duration, composite: "add" });
      } catch {
        el.animate(keyframes, { duration });
      }
    };

    const drawLimb = () => {
      const dx = limb ? limb.to.x - limb.from.x : 0;
      const dy = limb ? limb.to.y - limb.from.y : 0;
      const length = Math.hypot(dx, dy);
      if (!limb || length < 3) {
        limbEl.style.display = "none";
        return;
      }
      // A rubber band: slack ripples while it travels, taut once it has hold of something
      const nx = -dy / length;
      const ny = dx / length;
      const STEPS = 18;
      let d = "";
      for (let i = 0; i <= STEPS; i++) {
        const s = i / STEPS;
        const wave = limb.amp * Math.sin(Math.PI * s) * Math.sin(s * Math.PI * 3 + time * 34);
        d += `${i === 0 ? "M" : "L"}${(limb.from.x + dx * s + nx * wave).toFixed(1)} ${(limb.from.y + dy * s + ny * wave).toFixed(1)}`;
      }
      limbOutline.setAttribute("d", d);
      limbSkin.setAttribute("d", d);
      limbEnd.setAttribute("transform", `translate(${limb.to.x.toFixed(1)} ${limb.to.y.toFixed(1)}) rotate(${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(1)})`);
      fist.style.display = limb.kind === "arm" ? "" : "none";
      foot.style.display = limb.kind === "leg" ? "" : "none";
      limbEl.style.display = "";
    };

    /* ── Moving between pieces of text ── */

    const vanish = () => {
      if (perch) perch.left = time;
      perch = null;
      mode = { kind: "away" };
    };

    const destPoint = (dest: Dest) => (dest.surface ? onTop(dest.surface, dest.rel) : dest.sky);

    const aimAt = (surface: Surface | null, at?: number): Dest => {
      const dest: Dest = { surface, rel: 0, sky: { x: 0, y: 0 } };
      const away = mode.kind === "away";
      if (surface) {
        const { lo, hi, box, kx } = standRange(surface);
        if (at !== undefined) dest.rel = clamp(at, lo, hi);
        else if (away) dest.rel = lerp(lo, hi, Math.random());
        else dest.rel = clamp((x - box.left) / kx + (Math.random() - 0.5) * charW * 3, lo, hi);
      } else {
        dest.sky = { x: clamp(x + facing * vw * 0.18, charW, vw - charW), y: -charH * 1.6 };
      }
      return dest;
    };

    // The page scrolled his target away mid-move — pick up whatever text is in reach now
    const redirect = (dest: Dest, goal: Pt): Dest | null => {
      if (!dest.surface || (goal.y > -charH && goal.y < vh + charH * 2)) return null;
      return want && want !== "sky" && want !== dest.surface ? aimAt(want) : null;
    };

    // Throw an arm at the next spot; the flight follows once the hand has hold of it
    const go = (surface: Surface | null, at?: number) => {
      const away = mode.kind === "away";
      const dest = aimAt(surface, at);
      const goal = destPoint(dest);
      if (away) {
        // He was left behind off screen — come in from the edge the page is moving away from
        const side = Math.random() < 0.5 ? -1 : 1;
        x = clamp(goal.x + side * Math.min(vw * 0.22, charH * 3.2), charW, vw - charW);
        y = scrollDir >= 0 ? -charH * 0.2 : vh + charH * 1.3;
        facing = 1;
      }
      const distance = Math.hypot(goal.x - x, goal.y - (y - charH * 0.5));
      mode = { kind: "reach", dest, t: 0, dur: clamp(distance / (charH * 26), 0.2, 0.42), tugged: false };
    };

    const wantsMove = () =>
      want === "sky" ? y > -charH && y - charH < vh : want !== null && want !== perch;

    const touchDown = () => {
      if (!perch) return;
      puff({ x, y });
      react(perch, "bounce", rel);
    };

    const nextAction = () => {
      const s = perch;
      if (!s) return;
      if (want === "sky") return go(null);
      if (want && want !== s) return go(want);
      if (action.kind !== "idle") {
        action = { kind: "idle", t: 0, dur: 0.35 + Math.random() * 0.4 };
        return;
      }
      actions++;
      // Had his fun here — hop over to any other text that is on screen
      if (actions > 4) {
        const other = options.filter((o) => o !== s).sort((a, b) => a.left - b.left)[0];
        if (other) return go(other);
      }
      measure(s);
      const { lo, hi } = standRange(s);
      rel = clamp(rel, lo, hi);
      const farEnd = hi - rel > rel - lo ? hi : lo;
      const room = Math.abs(farEnd - rel);
      let kind: (typeof DECK)[number] = DECK[deck++ % DECK.length];
      if ((kind === "pull" || kind === "zip") && room < charW * 1.6) kind = "hop";
      if (kind === "run" && room < charW * 0.9) kind = "stomp";

      if (kind === "run") {
        const span = hi - lo;
        let to = lerp(lo, hi, Math.random());
        if (Math.abs(to - rel) < charW * 0.8) to = rel + Math.sign(farEnd - rel) * Math.min(room, Math.max(charW, span * 0.5));
        facing = to > rel ? 1 : -1;
        action = { kind: "run", t: 0, dur: Math.max(0.25, Math.abs(to - rel) / (charH * 3.2)), from: rel, to };
      } else if (kind === "pull") {
        const last = farEnd === hi ? s.segs[s.segs.length - 1] : s.segs[0];
        const far = clamp((last.x1 + last.x2) / 2, lo - charW, hi + charW);
        facing = 1;
        action = { kind: "pull", t: 0, dur: 1.3, far, fired: false };
      } else if (kind === "zip") {
        go(s, farEnd);
      } else if (kind === "stomp") {
        // The stretched leg comes down behind him, so turn his back to the longer side
        facing = rel - s.x1 > s.x2 - rel ? 1 : -1;
        const spot = clamp(rel - facing * charW * 0.9, s.x1, s.x2);
        action = { kind: "stomp", t: 0, dur: 1.2, spot, fired: false };
      } else {
        action = { kind: "hop", t: 0, dur: 0.9 };
      }
    };

    /* ── Per-frame behaviour ── */

    const stepPerch = (dt: number) => {
      const s = perch;
      if (!s || !s.el.isConnected) return vanish();
      const a = action;
      a.t += dt;
      const t = a.t;
      const u = Math.min(1, t / a.dur);
      let lift = 0;
      let afterPose: (() => void) | null = null;

      if (a.kind === "idle") {
        show(IDLE);
        sy = 1 + Math.sin(time * 4) * 0.015;
      } else if (a.kind === "run") {
        rel = lerp(a.from, a.to, u);
        lift = Math.abs(Math.sin(t * 22)) * charH * 0.03;
        rotate = 4;
        show(RUN[Math.floor(t * 14) % RUN.length]);
      } else if (a.kind === "hop") {
        // Crouch, then a full spin in the air
        const CROUCH = 0.14;
        if (t < CROUCH) {
          show(JUMP[0]);
          sy = 0.9;
          sx = 1.06;
        } else {
          const k = Math.min(1, (t - CROUCH) / (a.dur - CROUCH));
          lift = 4 * charH * 1.2 * k * (1 - k);
          rotate = 360 * easeInOut(k);
          sy = 1.05;
          sx = 0.97;
          show(k < 0.3 ? JUMP[1] : k < 0.72 ? JUMP[2] : JUMP[3]);
        }
      } else if (a.kind === "pull") {
        // Arm out to the far end of the word, haul it in, let it snap back
        const EXTEND = 0.3;
        const HOLD = 0.38;
        const PULL = 0.8;
        const dir = a.far > rel ? 1 : -1;
        show(IDLE);
        if (t < EXTEND) rotate = dir * 5 * (t / EXTEND);
        else if (t < HOLD) rotate = dir * 5;
        else if (t < PULL) {
          if (!a.fired) {
            a.fired = true;
            react(s, "pull", rel);
          }
          const k = easeOut((t - HOLD) / (PULL - HOLD));
          rotate = dir * (5 - 17 * k);
          sx = 1 + 0.04 * k;
        } else {
          const k = (t - PULL) / (a.dur - PULL);
          rotate = -dir * 12 * (1 - k) * Math.cos(k * Math.PI * 3.5);
          sy = 1 + 0.05 * Math.sin(k * Math.PI * 5) * (1 - k);
        }
        afterPose = () => {
          const hand = handToward(dir);
          const grip = onTop(s, a.far);
          if (t < EXTEND) limb = { kind: "arm", from: hand, to: mix(hand, grip, easeOut(t / EXTEND)), amp: charH * 0.14 * (1 - t / EXTEND) };
          else if (t < PULL) limb = { kind: "arm", from: hand, to: grip, amp: charH * 0.012 };
          else {
            const k = (t - PULL) / (a.dur - PULL);
            limb = { kind: "arm", from: hand, to: mix(grip, hand, easeIn(Math.min(1, k * 2.2))), amp: charH * 0.2 * (1 - k) };
          }
        };
      } else {
        // Jump, hang, and drive a stretched leg down onto the letters
        const CROUCH = 0.14;
        const RISE = 0.44;
        const STRIKE = 0.58;
        const HOLD = 0.72;
        const RETRACT = 0.94;
        const height = charH * 1.5;
        if (t < CROUCH) {
          show(JUMP[0]);
          sy = 0.88;
          sx = 1.07;
        } else if (t < RISE) {
          lift = height * easeOut((t - CROUCH) / (RISE - CROUCH));
          rotate = -6;
          show(JUMP[1]);
        } else if (t < RETRACT) {
          lift = height + Math.sin((t - RISE) * 6) * charH * 0.03;
          rotate = -14;
          show(JUMP[2]);
        } else {
          const k = (t - RETRACT) / (a.dur - RETRACT);
          lift = height * (1 - k * k);
          rotate = 6 * k;
          show(JUMP[3]);
        }
        afterPose = () => {
          if (t < RISE || t >= RETRACT) return;
          const hip = anchor(FLY_FOOT);
          const target = onTop(s, a.spot);
          if (t < STRIKE) limb = { kind: "leg", from: hip, to: mix(hip, target, easeIn((t - RISE) / (STRIKE - RISE))), amp: charH * 0.02 };
          else if (t < HOLD) {
            if (!a.fired) {
              a.fired = true;
              react(s, "stomp", a.spot);
              puff(target);
            }
            limb = { kind: "leg", from: hip, to: target, amp: charH * 0.03 };
          } else {
            const k = (t - HOLD) / (RETRACT - HOLD);
            limb = { kind: "leg", from: hip, to: mix(target, hip, easeOut(k)), amp: charH * 0.12 * (1 - k) };
          }
        };
      }

      smoothTop += (topAt(s, rel) - smoothTop) * Math.min(1, dt * 16);
      const feet = place(s, rel, smoothTop);
      x = feet.x;
      y = feet.y - lift;
      afterPose?.();

      // Carried off screen by the scroll
      if (feet.y < -charH * 0.3 || feet.y - charH > vh + charH * 0.3) return vanish();

      if (u >= 1) {
        if (a.kind === "hop" || a.kind === "stomp") {
          mode = { kind: "land", t: 0 };
          touchDown();
        } else nextAction();
      } else if ((a.kind === "idle" || a.kind === "run") && wantsMove()) nextAction();
    };

    const stepReach = (dt: number, m: Extract<Mode, { kind: "reach" }>) => {
      const surface = m.dest.surface;
      if (surface && !surface.el.isConnected) return vanish();
      m.t += dt;
      if (perch) {
        const feet = place(perch, rel, smoothTop);
        x = feet.x;
        y = feet.y;
      }
      let goal = destPoint(m.dest);
      const next = redirect(m.dest, goal);
      if (next) {
        m.dest = next;
        m.t = 0;
        m.tugged = false;
        goal = destPoint(next);
      }
      const dir = goal.x >= x ? 1 : -1;
      const u = Math.min(1, m.t / m.dur);
      show(IDLE);
      rotate = dir * 6 * easeOut(u);
      if (u >= 1) {
        // Hand has hold — sink into the wind-up
        const k = Math.min(1, (m.t - m.dur) / 0.12);
        sy = 1 - 0.1 * k;
        sx = 1 + 0.06 * k;
        if (!m.tugged) {
          m.tugged = true;
          if (surface) react(surface, "tug", m.dest.rel);
        }
      }
      const hand = handToward(dir);
      limb = { kind: "arm", from: hand, to: mix(hand, goal, easeOut(u)), amp: charH * (0.16 * (1 - u) + 0.01) };

      if (m.t >= m.dur + 0.12) {
        if (perch) perch.left = time;
        perch = null;
        facing = dir;
        const distance = Math.hypot(goal.x - x, goal.y - y);
        mode = { kind: "fly", dest: m.dest, t: 0, dur: clamp(distance / (charH * 15), 0.34, 0.62), from: { x, y } };
      }
    };

    const stepFly = (dt: number, m: Extract<Mode, { kind: "fly" }>) => {
      const surface = m.dest.surface;
      if (surface && !surface.el.isConnected) return vanish();
      m.t += dt;
      const next = redirect(m.dest, destPoint(m.dest));
      if (next && y > 0 && y - charH < vh) {
        // Still on screen: throw the arm again from mid-air
        const goal = destPoint(next);
        facing = goal.x >= x ? 1 : -1;
        mode = { kind: "fly", dest: next, t: 0, dur: clamp(Math.hypot(goal.x - x, goal.y - y) / (charH * 15), 0.34, 0.62), from: { x, y } };
        return;
      }
      if (next) return vanish();
      const u = Math.min(1, m.t / m.dur);
      const goal = destPoint(m.dest);
      // The arm snaps him in: slow off the mark, fastest on arrival
      const e = u * u * (1.6 - 0.6 * u);
      const distance = Math.hypot(goal.x - m.from.x, goal.y - m.from.y);
      x = lerp(m.from.x, goal.x, e);
      y = lerp(m.from.y, goal.y, e) - Math.sin(Math.PI * u) * Math.min(distance * 0.1, charH * 0.7);

      // Point the thrown fist at the grip, then swing upright for the landing
      const theta = (Math.atan2(goal.y - (y - charH * 0.55), goal.x - x) * 180) / Math.PI;
      let aim = facing === 1 ? theta - FLY_ARM_ANGLE : 180 - theta - FLY_ARM_ANGLE;
      aim = ((((aim + 180) % 360) + 360) % 360) - 180;
      const settle = smooth(0.6, 0.95, u);
      rotate = aim * (1 - settle);
      const stretch = Math.sin(Math.PI * u) * (1 - settle);
      sx = 1 + 0.14 * stretch;
      sy = 1 - 0.08 * stretch;
      if (u < 0.72) {
        show(JUMP[2]);
        const fistAt = anchor(FLY_FIST);
        limb = { kind: "arm", from: fistAt, to: mix(goal, fistAt, smooth(0.45, 0.72, u)), amp: charH * 0.01 };
      } else show(JUMP[3]);

      if (u < 1) return;
      if (!surface) return vanish();
      perch = surface;
      rel = m.dest.rel;
      smoothTop = topAt(surface, rel);
      surface.left = time;
      actions = 0;
      x = goal.x;
      y = goal.y;
      mode = { kind: "land", t: 0 };
      touchDown();
    };

    const stepLand = (dt: number, m: Extract<Mode, { kind: "land" }>) => {
      const s = perch;
      if (!s || !s.el.isConnected) return vanish();
      m.t += dt;
      const k = easeOut(Math.min(1, m.t / 0.22));
      show(JUMP[4]);
      sy = 0.84 + 0.16 * k;
      sx = 1.12 - 0.12 * k;
      const feet = place(s, rel, smoothTop);
      x = feet.x;
      y = feet.y;
      if (m.t >= 0.22) {
        mode = { kind: "perch" };
        action = { kind: "idle", t: 0, dur: 0.45 };
      }
    };

    const tick = ({ delta }: { delta: number }) => {
      const dt = Math.min(0.05, delta / 1000);
      time += dt;
      const scroll = window.scrollY;
      if (scroll !== lastScroll) scrollDir = scroll > lastScroll ? 1 : -1;
      lastScroll = scroll;
      planTimer -= dt;
      if (planTimer <= 0) {
        planTimer = 0.12;
        plan();
      }

      limb = null;
      rotate = 0;
      sx = 1;
      sy = 1;
      const m = mode;
      if (m.kind === "away") {
        if (want && want !== "sky") go(want);
      } else if (m.kind === "perch") stepPerch(dt);
      else if (m.kind === "reach") stepReach(dt, m);
      else if (m.kind === "fly") stepFly(dt, m);
      else stepLand(dt, m);

      wrap.style.visibility = mode.kind === "away" ? "hidden" : "visible";
      wrap.style.transform = `translate3d(${x - charW / 2}px, ${y - charH * (FOOT_Y / SPRITE_H)}px, 0)`;
      body.style.transform = `scaleX(${facing}) rotate(${rotate}deg) scale(${sx}, ${sy})`;
      drawLimb();
    };

    resize();
    y = -charH;
    window.addEventListener("resize", resize);
    // After framer-motion's own render step, so Lenis has already moved the page this frame
    frame.postRender(tick, true);

    return () => {
      cancelFrame(tick);
      window.removeEventListener("resize", resize);
    };
  }, [reduceMotion]);

  if (reduceMotion) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[150] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={dustRef} src={`${DIR}/dust.png`} alt="" className="absolute opacity-0" draggable={false} />
      <div ref={wrapRef} className="absolute left-0 top-0" style={{ willChange: "transform", visibility: "hidden" }}>
        <div ref={bodyRef} className="relative h-full w-full" style={{ transformOrigin: "50% 95%", willChange: "transform" }}>
          {FRAMES.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.25)]"
              style={{ opacity: 0 }}
            />
          ))}
        </div>
      </div>
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <g ref={limbRef} style={{ display: "none" }} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path stroke={OUTLINE} />
          <path stroke={SKIN} />
          <g data-end>
            <circle data-fist fill={SKIN} stroke={OUTLINE} />
            <g data-foot>
              <ellipse fill={SKIN} stroke={OUTLINE} />
              <line stroke={SOLE} />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
}
