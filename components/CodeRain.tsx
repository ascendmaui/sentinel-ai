"use client";

import { useEffect, useRef } from "react";

/**
 * OPTIONAL faint falling-code layer. Fully self-contained: delete this file and the single
 * <CodeRain /> line in app/layout.tsx (or set SHOW_CODE_RAIN = false in lib/brand.ts) to remove it.
 *
 * Deliberately not green and not katakana: plain ASCII glyphs in muted gold and violet-grey at very
 * low opacity, to stay clear of any film's signature look. Skipped for reduced-motion visitors.
 */
const GLYPHS = "01<>{}[]/=+;:#%&*".split("");

export function CodeRain() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const small = window.matchMedia("(max-width: 720px)").matches;
    const size = small ? 16 : 18;
    let W = 0;
    let H = 0;
    let cols: { y: number; v: number; c: number }[] = [];
    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
      const n = Math.ceil(W / (size * (small ? 2.6 : 2.2)));
      cols = Array.from({ length: n }, () => ({ y: Math.random() * H, v: 14 + Math.random() * 22, c: Math.random() }));
      ctx.font = `${size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    };
    resize();
    let raf = 0;
    let last = performance.now();
    let running = true;
    const step = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.fillStyle = "rgba(7,7,12,0.14)";
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      const gap = size * (small ? 2.6 : 2.2);
      cols.forEach((col, i) => {
        col.y += col.v * dt;
        if (col.y > H + 40) {
          col.y = -20;
          col.v = 14 + Math.random() * 22;
        }
        ctx.fillStyle = col.c > 0.35 ? "rgba(242,181,68,0.9)" : "rgba(176,160,220,0.9)";
        ctx.fillText(GLYPHS[(Math.random() * GLYPHS.length) | 0], i * gap, col.y);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("resize", resize);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="code-rain" aria-hidden="true" />;
}
