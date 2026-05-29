// Expanding-ring "shockwave" pulses — the press feedback. Pure state; the
// React layer samples each live wave's ring for the current radius.

export interface Wave {
  id: number;
  cx: number;
  cy: number;
  t: number; // seconds since emit
}

export const SHOCK_DUR = 0.5; // seconds to fully expand + fade
export const SHOCK_MAXR = 9; // max radius in *rows* (x is stretched ~2x)

export class Shockwaves {
  waves: Wave[] = [];
  private nextId = 1;

  emit(cx: number, cy: number): void {
    this.waves.push({ id: this.nextId++, cx, cy, t: 0 });
  }

  update(dtSec: number): void {
    for (const w of this.waves) w.t += dtSec;
    this.waves = this.waves.filter((w) => w.t < SHOCK_DUR);
  }
}
