// A tiny confetti / particle system. Pure state + physics; the React layer
// reads `particles` and draws each as an absolutely-positioned glyph.

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  char: string;
  color: string;
  life: number; // seconds remaining
  spin: number; // for glyph cycling
}

export interface Theme {
  glyphs: string[];
  colors: string[];
}

// vivid neon party palette (full RGB — this is the *flashy* layer, not the reels)
export const THEMES = {
  party: {
    glyphs: ["★", "✦", "✧", "●", "◆", "▲", "▼", "✺", "❉", "♦", "♥", "•", "*"],
    colors: ["#ff2d95", "#00e5ff", "#ffe600", "#7cff00", "#ff7a00", "#b026ff", "#ff0040", "#19ffd0", "#ffffff"],
  },
  bust: {
    glyphs: ["✗", "✘", "×", "▼", "☓", "■", "↓"],
    colors: ["#e74c3c", "#c0392b", "#7f1d1d", "#922b21", "#555555", "#ff3b3b"],
  },
  amber: {
    glyphs: ["✦", "★", "✧", "·", "•"],
    colors: ["#f39c12", "#e67e22", "#d35400", "#f1c40f", "#888888"],
  },
  gloom: {
    glyphs: ["·", "˙", ":", ".", "‚", "⋅"],
    colors: ["#6272a4", "#46506b", "#5b6b8c", "#444455", "#384057"],
  },
} satisfies Record<string, Theme>;

const GRAVITY = 42; // cells / s^2
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

export class Confetti {
  particles: Particle[] = [];
  private nextId = 1;
  private readonly cap: number;

  constructor(cap = 220) {
    this.cap = cap;
  }

  private add(p: Omit<Particle, "id">): void {
    if (this.particles.length >= this.cap) this.particles.shift();
    this.particles.push({ ...p, id: this.nextId++ });
  }

  /** Popper-style outward explosion from a point, biased upward. */
  burst(x: number, y: number, n: number, theme: Theme = THEMES.party): void {
    for (let i = 0; i < n; i++) {
      const a = rnd(-Math.PI * 0.92, -Math.PI * 0.08); // upper hemisphere
      const speed = rnd(12, 30);
      this.add({
        x,
        y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        char: pick(theme.glyphs),
        color: pick(theme.colors),
        life: rnd(1.1, 2.0),
        spin: rnd(0, 10),
      });
    }
  }

  /** Rain falling in from above the top edge. */
  rain(width: number, n: number, theme: Theme = THEMES.party): void {
    for (let i = 0; i < n; i++) {
      this.add({
        x: rnd(0, width),
        y: rnd(-4, 0),
        vx: rnd(-4, 4),
        vy: rnd(8, 16),
        char: pick(theme.glyphs),
        color: pick(theme.colors),
        life: rnd(2.5, 4),
        spin: rnd(0, 10),
      });
    }
  }

  update(dtSec: number, height: number): void {
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.vy += GRAVITY * dtSec;
      p.x += p.vx * dtSec;
      p.y += p.vy * dtSec;
      p.life -= dtSec;
      p.spin += dtSec * 8;
      if (p.life > 0 && p.y < height + 1) next.push(p);
    }
    this.particles = next;
  }
}
