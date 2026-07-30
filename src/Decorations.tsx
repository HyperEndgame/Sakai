import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { Decoration } from "./store";

// ponytail: cherry blossom is CSS keyframes (cheap, static fallback lives in styles.css).
// Constellation is canvas (ported from teambir) since it needs per-frame star links.

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function Decorations({ theme, decoration }: { theme: "light" | "dark"; decoration: Decoration }) {
  if (decoration === "none") return null;
  if (decoration === "cherry-blossom" && theme === "light") return <CherryBlossom />;
  if (decoration === "constellation" && theme === "dark") return <Constellation />;
  return null;
}

function CherryBlossom() {
  const petals = useMemo(() => {
    const rnd = seeded(42);
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      top: rnd() * 90,
      delay: rnd() * 14,
      duration: 11 + rnd() * 8,
      size: 8 + rnd() * 7,
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size * 0.8}px`,
              // negative delay starts each petal mid-fall instead of all 14 sitting at
              // their 0% keyframe (top:0, opacity:1) until the delay elapses
              animationDelay: `-${p.delay}s`,
              animationDuration: `${p.duration}s`,
              // reduced-motion fallback: static scattered position (styles.css)
              "--petal-y": `${p.top}%`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

const MAX_STARS = 90; // ponytail: link pass below is O(n^2) over stars per frame; fine at
// this cap, swap to a spatial grid if density or frame rate ever needs to grow
const MOUSE_RADIUS = 160;

function starParams(w: number) {
  const small = w < 500;
  return {
    cell: small ? 72 : 120,
    lineAlpha: small ? 0.18 : 0.08,
    linkDist: small ? 130 : 160,
    alphaNormal: small ? 0.55 : 0.3,
    alphaActive: small ? 0.95 : 0.6,
    rScale: small ? 1.6 : 1.0,
  };
}

type Star = { x: number; y: number; vx: number; vy: number; r: number };

// ported from teambir's ConstellationBg.tsx (canvas star field + link lines + pointer glow),
// recolored via --star-rgb instead of the hardcoded teambir gold
function Constellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const canvasCtx = canvasEl.getContext("2d");
    if (!canvasCtx) return;
    // re-bind as non-null locals: TS forgets the narrowing above once these are
    // captured by the nested draw functions below
    const canvas: HTMLCanvasElement = canvasEl;
    const ctx: CanvasRenderingContext2D = canvasCtx;

    const rgb = getComputedStyle(document.documentElement).getPropertyValue("--star-rgb").trim() || "231 136 93";
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mouse = { x: -9999, y: -9999 };
    let params = starParams(0);
    let stars: Star[] = [];
    let frame: number | null = null;

    function initStars(w: number, h: number) {
      params = starParams(w);
      let cols = Math.max(3, Math.round(w / params.cell));
      let rows = Math.max(2, Math.round(h / params.cell));
      if (cols * rows > MAX_STARS) {
        // shrink the grid (not just the count) so every cell still gets exactly one star —
        // capping count alone while deriving col/row from the uncapped cols leaves empty rows
        const scale = Math.sqrt(MAX_STARS / (cols * rows));
        cols = Math.max(3, Math.floor(cols * scale));
        rows = Math.max(2, Math.min(rows, Math.floor(MAX_STARS / cols)));
      }
      const count = cols * rows;
      stars = Array.from({ length: count }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return {
          x: (col + 0.15 + Math.random() * 0.7) / cols,
          y: (row + 0.15 + Math.random() * 0.7) / rows,
          vx: (Math.random() - 0.5) * 0.00008,
          vy: (Math.random() - 0.5) * 0.00008,
          r: Math.random() * 0.8 + 0.3,
        };
      });
    }

    function drawLinks(w: number, h: number) {
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const a = stars[i];
          const b = stars[j];
          const dx = (a.x - b.x) * w;
          const dy = (a.y - b.y) * h;
          const dist2 = dx * dx + dy * dy;
          if (dist2 >= params.linkDist ** 2) continue;
          const dist = Math.sqrt(dist2);
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${rgb}, ${params.lineAlpha * (1 - dist / params.linkDist)})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(a.x * w, a.y * h);
          ctx.lineTo(b.x * w, b.y * h);
          ctx.stroke();
        }
      }
    }

    function drawStars(w: number, h: number, animate: boolean) {
      stars.forEach((s) => {
        const sx = s.x * w;
        const sy = s.y * h;
        const near = animate && Math.hypot(sx - mouse.x, sy - mouse.y) < MOUSE_RADIUS;
        if (near) {
          ctx.beginPath();
          const dist = Math.hypot(sx - mouse.x, sy - mouse.y);
          ctx.strokeStyle = `rgba(${rgb}, ${0.2 * (1 - dist / MOUSE_RADIUS)})`;
          ctx.lineWidth = 0.6;
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(sx, sy);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.fillStyle = `rgba(${rgb}, ${near ? params.alphaActive : params.alphaNormal})`;
        ctx.arc(sx, sy, (near ? s.r * 1.6 : s.r) * params.rScale, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawFrame(animate: boolean) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (animate) {
        stars.forEach((s) => {
          s.x = (s.x + s.vx + 1) % 1;
          s.y = (s.y + s.vy + 1) % 1;
        });
      }
      drawLinks(w, h);
      drawStars(w, h, animate);
    }

    function loop() {
      drawFrame(true);
      frame = requestAnimationFrame(loop);
    }

    // ResizeObserver fires once dimensions are known (fixes mobile 0x0 at mount)
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = entry.contentRect.width;
      const h = entry.contentRect.height;
      if (w === 0 || h === 0) return;
      canvas.width = w;
      canvas.height = h;
      initStars(w, h);
      if (reduced) drawFrame(false);
      else if (frame === null) loop();
    });
    ro.observe(canvas);

    // reduced motion: one static frame, no rAF loop, no pointer tracking
    if (reduced) return () => ro.disconnect();

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const onTouchMove = (e: TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      if (!t) return;
      mouse.x = t.clientX - rect.left;
      mouse.y = t.clientY - rect.top;
    };
    const onTouchEnd = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-0 h-full w-full" aria-hidden="true" />;
}
