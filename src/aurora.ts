// Aurora-Canvas: mehrere Vorhang-Bänder aus vertikalen Gradient-Strokes.
// Form driftet über überlagerte Sinus-Felder (pseudo-Noise), additive Blends,
// Weichzeichnung über Low-Res-Offscreen-Canvas. DPR-Cap 1.5, Pause offscreen,
// prefers-reduced-motion → ein statisches Frame.

import { prefersReducedMotion } from './utils';

interface Band {
  baseY: number; // relative Höhe des Bandfusses (0..1)
  amp: number; // vertikale Drift-Amplitude (relativ)
  height: number; // Vorhanghöhe (relativ)
  speed: number;
  seed: number;
  hueShift: number; // verschiebt den Verlauf Grün→Türkis→Violett
  alpha: number;
}

const BANDS: Band[] = [
  { baseY: 0.52, amp: 0.09, height: 0.34, speed: 0.21, seed: 11.3, hueShift: 0.00, alpha: 0.5 },
  { baseY: 0.40, amp: 0.06, height: 0.26, speed: 0.34, seed: 47.9, hueShift: 0.25, alpha: 0.36 },
  { baseY: 0.29, amp: 0.05, height: 0.20, speed: 0.13, seed: 83.1, hueShift: 0.55, alpha: 0.26 },
];

// Verlauf Grün → Türkis → Violett (nie ein einzelnes Grün)
const STOPS: [number, number, number][] = [
  [77, 232, 166], // #4DE8A6
  [53, 214, 210], // #35D6D2
  [142, 123, 255], // #8E7BFF
];

function paletteAt(u: number): [number, number, number] {
  const t = Math.min(1, Math.max(0, u)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  const f = t - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

// Überlagerte Sinusse mit irrationalen Frequenzverhältnissen — billiger Noise-Ersatz
function drift(x: number, t: number, seed: number): number {
  return (
    Math.sin(x * 1.7 + t * 0.9 + seed) * 0.5 +
    Math.sin(x * 3.1 - t * 0.6 + seed * 2.7) * 0.3 +
    Math.sin(x * 6.7 + t * 0.35 + seed * 1.3) * 0.2
  );
}

export class Aurora {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private off: HTMLCanvasElement;
  private offCtx: CanvasRenderingContext2D;
  private running = false;
  private visible = true;
  private raf = 0;
  private t = Math.PI * 4; // fester Startpunkt — kein Date.now nötig
  private last = 0;
  private intensity = 1;
  private targetIntensity = 1;
  private reduced = prefersReducedMotion();
  private blurOk = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.off = document.createElement('canvas');
    this.offCtx = this.off.getContext('2d')!;
    this.blurOk = typeof this.ctx.filter === 'string';

    this.resize();
    let rt = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => { this.resize(); if (this.reduced) this.renderStatic(); }, 150);
    });

    const io = new IntersectionObserver(([e]) => {
      this.visible = e.isIntersecting;
      this.toggle();
    });
    io.observe(canvas);
    document.addEventListener('visibilitychange', () => this.toggle());

    window.addEventListener('nordlys:max', () => { this.targetIntensity = 1.9; });

    if (this.reduced) this.renderStatic();
    else this.toggle();
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    // Offscreen bewusst niedrig aufgelöst — das Upscaling ist der Weichzeichner
    this.off.width = Math.max(160, Math.round(w / 3));
    this.off.height = Math.max(120, Math.round(h / 3));
  }

  private toggle() {
    const should = this.visible && !document.hidden && !this.reduced;
    if (should && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else if (!should && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.intensity += (this.targetIntensity - this.intensity) * Math.min(1, dt * 2);
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private renderStatic() {
    this.draw();
  }

  private draw() {
    const o = this.offCtx;
    const w = this.off.width;
    const h = this.off.height;
    o.globalCompositeOperation = 'source-over';
    o.clearRect(0, 0, w, h);
    o.globalCompositeOperation = 'lighter';

    const step = 3;
    for (const band of BANDS) {
      const t = this.t * band.speed;
      for (let x = 0; x <= w; x += step) {
        const u = x / w;
        const d = drift(u * 4, t, band.seed);
        const base = (band.baseY + d * band.amp) * h;
        const hgt = band.height * h * (0.7 + 0.3 * drift(u * 2.3, t * 0.7, band.seed + 5));
        const top = base - hgt;
        // Farbe wandert mit Position + Drift durch den Verlauf
        const cu = u * 0.7 + band.hueShift + 0.15 * Math.sin(t * 0.5 + u * 3);
        const [r, g, b] = paletteAt(cu);
        const a = band.alpha * this.intensity * (0.55 + 0.45 * drift(u * 7.7, t * 1.4, band.seed + 9));
        if (a <= 0.02) continue;
        const grad = o.createLinearGradient(0, base, 0, top);
        grad.addColorStop(0, `rgba(${r | 0},${g | 0},${b | 0},${Math.min(0.9, a).toFixed(3)})`);
        grad.addColorStop(0.45, `rgba(${r | 0},${g | 0},${b | 0},${(a * 0.35).toFixed(3)})`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        o.fillStyle = grad;
        o.fillRect(x, top, step + 1, hgt);
      }
    }

    const c = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    c.clearRect(0, 0, cw, ch);
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = 'high';
    if (this.blurOk) c.filter = `blur(${Math.round(cw / 240)}px)`;
    c.globalAlpha = 1;
    c.drawImage(this.off, 0, 0, cw, ch);
    if (this.blurOk) {
      // zweiter, schärferer Durchgang gibt den Bändern Kontur
      c.filter = 'none';
      c.globalAlpha = 0.35;
      c.drawImage(this.off, 0, 0, cw, ch);
      c.globalAlpha = 1;
    }
  }
}
