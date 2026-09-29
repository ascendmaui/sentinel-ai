"use client";

import { useEffect, useRef } from "react";

/**
 * Animated seraphim: an angel of gold light with six wings, drawn as filaments and particles
 * with a bright point of light in the chest. Pure canvas 2D with a hand-rolled 3D projection
 * (no three.js, no extra dependency), so the bundle stays tiny and it runs on phones.
 *
 * - prefers-reduced-motion: renders one static frame and never starts the loop.
 * - Pauses when off screen or when the tab is hidden.
 * - Fewer particles and a lower pixel ratio on small screens.
 * Original geometry; no film or third-party asset is used.
 */

type P = { x: number; y: number; z: number; w: number; s: number; a: number; side: number; layer: number; k: number };

function build(density: number) {
  const pts: P[] = [];
  const lines: number[][] = []; // index lists forming filaments
  const add = (x: number, y: number, z: number, w = 1, s = 0, a = 1, side = 0, layer = 0, k = 0) => {
    pts.push({ x, y, z, w, s, a, side, layer, k });
    return pts.length - 1;
  };
  // Wings: three tiers per side, each a fan of feather filaments.
  const tiers = [
    { y0: 0.62, ang: 1.15, span: 0.75, len: 1.15, layer: 0 },
    { y0: 0.5, ang: 0.62, span: 0.7, len: 1.3, layer: 1 },
    { y0: 0.36, ang: 0.05, span: 0.65, len: 1.05, layer: 2 },
  ];
  for (const side of [-1, 1]) {
    for (const t of tiers) {
      const feathers = Math.round(11 * density);
      for (let f = 0; f < feathers; f++) {
        const k = f / (feathers - 1);
        const th = t.ang + (k - 0.5) * t.span;
        const L = t.len * (0.55 + 0.45 * Math.sin(Math.min(1, k * 1.1 + 0.15) * Math.PI * 0.62 + 0.4));
        const steps = Math.round(22 * density);
        const idx: number[] = [];
        for (let i = 0; i <= steps; i++) {
          const s = i / steps;
          const bend = 0.28 * s * s;
          const px = side * (0.09 + L * s * Math.cos(th) * 0.95);
          const py = t.y0 + L * s * Math.sin(th) * 0.9 - bend * (t.layer === 2 ? 1.2 : 0.3);
          const pz = (k - 0.5) * 0.22 + t.layer * 0.03 - s * 0.05;
          idx.push(add(px, py, pz, 1, s, 1 - s * 0.55, side, t.layer, k));
        }
        lines.push(idx);
      }
    }
  }
  // Body: a slim flame-like column.
  const rings = Math.round(26 * density);
  for (let r = 0; r <= rings; r++) {
    const u = r / rings;
    const yy = -0.85 + u * 1.75;
    const rad = 0.17 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, u * 0.98 + 0.01))), 0.8);
    const per = Math.max(6, Math.round(16 * density));
    for (let j = 0; j < per; j++) {
      const ph = (j / per) * Math.PI * 2 + u * 2;
      add(Math.cos(ph) * rad, yy, Math.sin(ph) * rad * 0.7, 0.8, u, 0.85, 0, 3, 0);
    }
  }
  // Head and halo.
  const hp = Math.round(60 * density);
  for (let i = 0; i < hp; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    add(0.12 * Math.sin(b) * Math.cos(a), 1.06 + 0.12 * Math.cos(b), 0.12 * Math.sin(b) * Math.sin(a), 1, 0.5, 1, 0, 4, 0);
  }
  const hl: number[] = [];
  const hs = Math.round(60 * density);
  for (let i = 0; i <= hs; i++) {
    const a = (i / hs) * Math.PI * 2;
    hl.push(add(Math.cos(a) * 0.22, 1.36, Math.sin(a) * 0.22, 1.1, 0.5, 1, 0, 5, 0));
  }
  lines.push(hl);
  // Ambient motes drifting upward.
  const motes = Math.round(70 * density);
  const moteStart = pts.length;
  for (let i = 0; i < motes; i++) {
    add((Math.random() - 0.5) * 3.2, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.2, 0.7, Math.random(), 0.5, 0, 6, Math.random());
  }
  return { pts, lines, moteStart };
}

export function HeroFigure() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const stage = canvas.parentElement as HTMLElement;

    const small = window.matchMedia("(max-width: 720px)").matches;
    const density = small ? 0.6 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    const model = build(density);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    let W = 0;
    let H = 0;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      H = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    // Pre-rendered glow sprite.
    const spr = document.createElement("canvas");
    spr.width = spr.height = 64;
    const sg = spr.getContext("2d")!;
    const gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,244,214,1)");
    gr.addColorStop(0.25, "rgba(255,214,130,0.55)");
    gr.addColorStop(1, "rgba(242,181,68,0)");
    sg.fillStyle = gr;
    sg.fillRect(0, 0, 64, 64);

    const proj = new Array(model.pts.length);
    const draw = (t: number) => {
      ctx.clearRect(0, 0, W, H);
      const yaw = Math.sin(t * 0.35) * 0.5;
      const pitch = Math.sin(t * 0.23) * 0.06;
      const cy = Math.cos(yaw);
      const sy = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const scale = Math.min(W, H) * 0.3;
      const bob = Math.sin(t * 0.9) * 0.03;
      const flap = Math.sin(t * 0.8) * 0.16 + 0.04;
      ctx.globalCompositeOperation = "lighter";

      for (let i = 0; i < model.pts.length; i++) {
        const p = model.pts[i];
        let x = p.x;
        let y = p.y + bob;
        let z = p.z;
        if (p.layer === 6) {
          y = ((p.y + 1.5 + t * (0.05 + p.k * 0.08)) % 3) - 1.5;
          x += Math.sin(t * 0.4 + p.s * 9) * 0.05;
        } else if (p.side !== 0 && p.layer <= 2) {
          // wings sweep forward and back around the shoulder line
          const dx = x - p.side * 0.09;
          const ph = flap * (1 + p.layer * 0.25) * p.s;
          x = p.side * 0.09 + dx * Math.cos(ph);
          z = z + Math.abs(dx) * Math.sin(ph) * p.side * -1;
          y += Math.sin(t * 0.8 + p.layer) * 0.025 * p.s;
        }
        // rotate yaw then pitch
        const x1 = x * cy + z * sy;
        const z1 = -x * sy + z * cy;
        const y2 = y * cp - z1 * sp;
        const z2 = y * sp + z1 * cp;
        const persp = 3.2 / (3.2 + z2);
        proj[i] = { X: W / 2 + x1 * scale * persp, Y: H * 0.52 - y2 * scale * persp, d: persp, p };
      }

      // Filaments
      ctx.lineWidth = 0.8;
      for (const line of model.lines) {
        ctx.beginPath();
        for (let i = 0; i < line.length; i++) {
          const q = proj[line[i]];
          if (i === 0) ctx.moveTo(q.X, q.Y);
          else ctx.lineTo(q.X, q.Y);
        }
        const q0 = proj[line[line.length - 1]];
        ctx.strokeStyle = `rgba(242,181,68,${0.16 + q0.d * 0.06})`;
        ctx.stroke();
      }
      // Particles
      for (let i = 0; i < proj.length; i++) {
        const q = proj[i];
        const p = q.p as P;
        const tw = 0.65 + 0.35 * Math.sin(t * 2 + i * 1.7);
        const alpha = Math.min(1, p.a * tw * (0.55 + q.d * 0.5));
        const size = (p.layer === 6 ? 1.1 : 1.5) * q.d * p.w;
        ctx.fillStyle = p.layer === 6 ? `rgba(196,170,255,${alpha * 0.5})` : `rgba(255,${205 + Math.round(p.s * 40)},${120 + Math.round(p.s * 90)},${alpha})`;
        ctx.fillRect(q.X - size / 2, q.Y - size / 2, size, size);
        if (i % 9 === 0 && p.layer !== 6) {
          const g = size * 9;
          ctx.globalAlpha = alpha * 0.55;
          ctx.drawImage(spr, q.X - g / 2, q.Y - g / 2, g, g);
          ctx.globalAlpha = 1;
        }
      }
      // Chest light
      const cx = W / 2 + Math.sin(yaw) * 0 * scale;
      const cyy = H * 0.52 - (0.3 + bob) * scale;
      const pulse = 1 + Math.sin(t * 1.6) * 0.12;
      const R = scale * 0.5 * pulse;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(spr, cx - R, cyy - R, R * 2, R * 2);
      ctx.globalAlpha = 1;
      const R2 = scale * 0.14 * pulse;
      const g2 = ctx.createRadialGradient(cx, cyy, 0, cx, cyy, R2);
      g2.addColorStop(0, "rgba(255,255,255,1)");
      g2.addColorStop(0.4, "rgba(255,240,200,0.9)");
      g2.addColorStop(1, "rgba(255,200,100,0)");
      ctx.fillStyle = g2;
      ctx.beginPath();
      ctx.arc(cx, cyy, R2, 0, Math.PI * 2);
      ctx.fill();
      // soft rays
      ctx.strokeStyle = "rgba(255,230,170,0.22)";
      ctx.lineWidth = 1;
      for (let r = 0; r < 8; r++) {
        const a = (r / 8) * Math.PI * 2 + t * 0.2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * R2, cyy + Math.sin(a) * R2);
        ctx.lineTo(cx + Math.cos(a) * R * 0.95, cyy + Math.sin(a) * R * 0.95);
        ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
    };

    let raf = 0;
    let running = false;
    let visible = true;
    const t0 = performance.now();
    const loop = (now: number) => {
      if (!running) return;
      draw((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduce.matches || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const still = () => draw(1.2);

    stage.classList.add("is-3d");
    if (reduce.matches) still();
    else start();

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(stage);
    const onVis = () => (document.hidden ? stop() : start());
    const onMotion = () => {
      if (reduce.matches) {
        stop();
        still();
      } else start();
    };
    const onResize = () => {
      resize();
      if (reduce.matches) still();
    };
    document.addEventListener("visibilitychange", onVis);
    reduce.addEventListener("change", onMotion);
    window.addEventListener("resize", onResize);
    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      reduce.removeEventListener("change", onMotion);
      window.removeEventListener("resize", onResize);
      stage.classList.remove("is-3d");
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}
