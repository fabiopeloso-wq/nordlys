// Sternfeld mit subtilem Funkeln. Eigener Canvas hinter der Aurora,
// ~24 fps reichen, Pause offscreen, reduced-motion → statisch.

import { prefersReducedMotion } from './utils';

interface Star { x: number; y: number; r: number; a: number; phase: number; speed: number; }

export class Starfield {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stars: Star[] = [];
  private running = false;
  private visible = true;
  private raf = 0;
  private t = 0;
  private last = 0;
  private acc = 0;
  private reduced = prefersReducedMotion();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    let rt = 0;
    window.addEventListener('resize', () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => { this.resize(); if (this.reduced) this.draw(); }, 150);
    });
    const io = new IntersectionObserver(([e]) => { this.visible = e.isIntersecting; this.toggle(); });
    io.observe(canvas);
    document.addEventListener('visibilitychange', () => this.toggle());
    if (this.reduced) this.draw();
    else this.toggle();
  }

  private resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.seed();
  }

  private seed() {
    // deterministisch (Mulberry32), damit der Himmel bei jedem Resize derselbe bleibt
    let s = 0x9e3779b9;
    const rnd = () => {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let x = Math.imul(s ^ (s >>> 15), 1 | s);
      x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
    const w = this.canvas.width;
    const h = this.canvas.height;
    const count = Math.round((w * h) / 9000);
    this.stars = [];
    for (let i = 0; i < count; i++) {
      const y = rnd() * h;
      this.stars.push({
        x: rnd() * w,
        y,
        r: rnd() < 0.12 ? 1.6 : rnd() < 0.5 ? 1 : 0.6,
        a: (0.25 + rnd() * 0.55) * (1 - (y / h) * 0.45), // unten (Richtung Berge) dunkler
        phase: rnd() * Math.PI * 2,
        speed: 0.3 + rnd() * 1.2,
      });
    }
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
    this.acc += dt;
    if (this.acc >= 1 / 24) { // 24 fps reichen fürs Funkeln
      this.t += this.acc;
      this.acc = 0;
      this.draw();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw() {
    const c = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    c.clearRect(0, 0, w, h);
    c.fillStyle = '#EAF2FA';
    for (const s of this.stars) {
      const tw = 0.65 + 0.35 * Math.sin(this.t * s.speed + s.phase);
      c.globalAlpha = s.a * tw;
      c.fillRect(s.x, s.y, s.r, s.r);
    }
    // Polarstern: fix, etwas grösser, feines Kreuz
    const px = w * 0.76;
    const py = h * 0.14;
    const pulse = this.reduced ? 1 : 0.8 + 0.2 * Math.sin(this.t * 0.8);
    c.globalAlpha = 0.9 * pulse;
    c.fillRect(px - 1.5, py - 1.5, 3, 3);
    c.globalAlpha = 0.4 * pulse;
    c.fillRect(px - 7, py - 0.5, 14, 1);
    c.fillRect(px - 0.5, py - 7, 1, 14);
    c.globalAlpha = 1;
  }
}
