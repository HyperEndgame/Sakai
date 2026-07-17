import { useMemo } from "react";

// ponytail: ambient-only decoration, CSS keyframes not canvas — cheap enough to leave
// running, and every animation has a static fallback via prefers-reduced-motion (app.css)

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function CherryBlossom() {
  const petals = useMemo(() => {
    const rnd = seeded(42);
    return Array.from({ length: 14 }, (_, i) => ({
      id: i,
      left: rnd() * 100,
      delay: rnd() * 14,
      duration: 11 + rnd() * 8,
      size: 8 + rnd() * 7,
      drift: (rnd() - 0.5) * 60,
    }));
  }, []);

  return (
    <div className="decor decor-blossom" aria-hidden="true">
      {petals.map((p) => (
        <span
          key={p.id}
          className="petal"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.8}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            // @ts-ignore custom property for horizontal drift
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export function Constellation() {
  const stars = useMemo(() => {
    const rnd = seeded(7);
    return Array.from({ length: 22 }, (_, i) => ({
      id: i,
      x: rnd() * 100,
      y: rnd() * 100,
      r: 0.6 + rnd() * 1,
      delay: rnd() * 6,
    }));
  }, []);

  const lines = useMemo(() => {
    const out: { a: number; b: number }[] = [];
    for (let i = 0; i < stars.length; i++) {
      let best = -1;
      let bestD = Infinity;
      for (let j = 0; j < stars.length; j++) {
        if (i === j) continue;
        const d = (stars[i].x - stars[j].x) ** 2 + (stars[i].y - stars[j].y) ** 2;
        if (d < bestD) { bestD = d; best = j; }
      }
      if (best >= 0 && bestD < 500) out.push({ a: i, b: best });
    }
    return out;
  }, [stars]);

  return (
    <svg className="decor decor-constellation" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
      {lines.map((l, i) => (
        <line
          key={i}
          x1={stars[l.a].x} y1={stars[l.a].y}
          x2={stars[l.b].x} y2={stars[l.b].y}
          className="constellation-line"
        />
      ))}
      {stars.map((s) => (
        <circle
          key={s.id}
          cx={s.x} cy={s.y} r={s.r}
          className="constellation-star"
          style={{ animationDelay: `${s.delay}s` }}
        />
      ))}
    </svg>
  );
}
