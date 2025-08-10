import { Component, ViewEncapsulation, AfterViewInit, OnDestroy, NgZone, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';

type BlobBall = {
  x: number; y: number; vx: number; vy: number; r: number; _rb: number; phase: number; hueShift: number;
};

type Config = {
  DPR_MAX: number;
  BASE_COUNT: number;            // baseline number of blobs
  COUNT_BOOST_MAX: number;       // extra blobs on big screens
  SIZE_MIN: number;              // as fraction of min(window)
  SIZE_MAX: number;              // as fraction of min(window)
  DRIFT_UP_MIN: number;          // px/ms
  DRIFT_UP_MAX: number;          // px/ms
  SWIRL_SCALE: number;           // flow field scale
  SWIRL_STRENGTH: number;        // flow influence
  SPEED_SCALE: number;           // global speed multiplier
  SPEED_SCALE_REDUCED: number;   // speed with prefers-reduced-motion
  MAX_VX: number; MAX_VY_UP: number; MAX_VY_DOWN: number;
  TRAIL_ALPHA: number;           // veil darkness
  VIGNETTE_CENTER_X: number;     // 0..1
  VIGNETTE_CENTER_Y: number;     // 0..1
  COLOR_S: number;               // HSL S%
  COLOR_L0: number;              // inner L%
  COLOR_L1: number;              // mid L%
  COLOR_L2: number;              // outer L%
  COLOR_JITTER0: number;         // degrees added at stop 0.5
  COLOR_JITTER1: number;         // degrees added at stop 1.0
  SHADOW_L: number;              // shadow lightness
  GRAIN_STRENGTH: number;        // 0..1
  POINTER_RADIUS_SCALE: number;  // interaction radius relative to blob size
  POINTER_STRENGTH: number;
  POINTER_VBOOST: number;
  BURST_MIN: number;             // burst size min (fraction of min window)
  BURST_MAX: number;             // burst size max (fraction of min window)
  BURST_VX: number;              // burst vx range (+/-)
  BURST_VY_MIN: number;          // negative (up)
  BURST_VY_MAX: number;          // negative (up)
};

// === ONE PLACE TO TWEAK SETTINGS ===
const CFG: Config = {
  DPR_MAX: 2,
  BASE_COUNT: 6,
  COUNT_BOOST_MAX: 6,
  SIZE_MIN: 0.05,
  SIZE_MAX: 0.11,
  DRIFT_UP_MIN: 10 / 1000,
  DRIFT_UP_MAX: 18 / 1000,
  SWIRL_SCALE: 0.0007,
  SWIRL_STRENGTH: 0.018,
  SPEED_SCALE: 0.85,
  SPEED_SCALE_REDUCED: 0.55,
  MAX_VX: 0.12, MAX_VY_UP: 0.22, MAX_VY_DOWN: 0.05,
  TRAIL_ALPHA: 0.16,
  VIGNETTE_CENTER_X: 0.5, VIGNETTE_CENTER_Y: 0.55,
  COLOR_S: 85, COLOR_L0: 58, COLOR_L1: 50, COLOR_L2: 42,
  COLOR_JITTER0: 10, COLOR_JITTER1: 22,
  SHADOW_L: 68,
  GRAIN_STRENGTH: 0.022,
  POINTER_RADIUS_SCALE: 1.8,
  POINTER_STRENGTH: 0.10,
  POINTER_VBOOST: 0.10,
  BURST_MIN: 0.018, BURST_MAX: 0.04,
  BURST_VX: 0.08,
  BURST_VY_MIN: -0.22, BURST_VY_MAX: -0.10,
};

@Component({
  selector: 'app-bg-lava',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bg-lava.component.html',
  styleUrls: ['./bg-lava.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BgLavaComponent implements AfterViewInit, OnDestroy {
  private rafId: number | null = null;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private dpr = Math.min(CFG.DPR_MAX, window.devicePixelRatio || 1);
  private running = false;
  private lastT = 0;

  private blobs: BlobBall[] = [];
  private noiseSeed = Math.random() * 1000;

  // motion / pointer
  private reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private onReduceMotion = (e: MediaQueryListEvent) => {
    this.reduceMotion = e.matches; this.toggleAnimation(!this.reduceMotion);
  };
  private pointer = { active: false, x: 0, y: 0, vx: 0, vy: 0, lastX: 0, lastY: 0, attract: false };

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    const mql = matchMedia('(prefers-reduced-motion: reduce)');
    mql.addEventListener?.('change', this.onReduceMotion);

    this.canvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;
    if (!ctx) return; this.ctx = ctx;

    this.setupCanvas();
    this.seedBlobs();

    this.zone.runOutsideAngular(() => {
      this.toggleAnimation(true);
      this.trackScroll();
      window.addEventListener('resize', this.onResize, { passive: true });
      window.addEventListener('pointermove', this.onPointerMove, { passive: true });
      window.addEventListener('pointerdown', this.onPointerDown, { passive: true });
      window.addEventListener('pointerup', this.onPointerUp, { passive: true });
      window.addEventListener('keydown', this.onKey, { passive: true });
      window.addEventListener('keyup', this.onKey, { passive: true });
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    const mql = matchMedia('(prefers-reduced-motion: reduce)');
    mql.removeEventListener?.('change', this.onReduceMotion);
    this.toggleAnimation(false);
  }

  // ===== Canvas & layout =====
  private onResize = () => {
    this.setupCanvas();
    const w = window.innerWidth, h = window.innerHeight;
    for (const b of this.blobs) {
      const rb = b._rb;
      b.x = Math.min(Math.max(b.x, rb), this.canvas.width - rb);
      b.y = Math.min(Math.max(b.y, rb), this.canvas.height - rb);
      if (b.y < rb) b.y = Math.random() * h * 0.6 + h * 0.3;
    }
  };

  private setupCanvas() {
    const w = window.innerWidth, h = window.innerHeight;
    this.canvas.width = Math.ceil(w * this.dpr);
    this.canvas.height = Math.ceil(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private seedBlobs() {
    const densityBoost = Math.max(0, Math.min(1, (innerWidth * innerHeight) / (1600 * 900)));
    const count = Math.round(CFG.BASE_COUNT + densityBoost * CFG.COUNT_BOOST_MAX);
    const w = innerWidth, h = innerHeight; const side = Math.min(w, h);

    this.blobs = Array.from({ length: count }, () => {
      const r = this.rand(CFG.SIZE_MIN, CFG.SIZE_MAX) * side;
      const up = this.rand(CFG.DRIFT_UP_MIN, CFG.DRIFT_UP_MAX);
      // Spread across the screen initially (avoid edges by 1 radius)
      return {
        x: this.rand(r, w - r),
        y: this.rand(r, h - r),
        vx: this.rand(-0.02, 0.02),
        vy: -up,
        r, _rb: r,
        phase: Math.random() * Math.PI * 2,
        hueShift: Math.random()
      } as BlobBall;
    });
  }

  private toggleAnimation(shouldRun: boolean) {
    if (shouldRun && !this.running) {
      this.running = true; this.lastT = performance.now(); this.rafId = requestAnimationFrame(this.frame);
    } else if (!shouldRun && this.running) {
      this.running = false; if (this.rafId != null) cancelAnimationFrame(this.rafId); this.rafId = null; this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private frame = (t: number) => { if (this.running) { const dt = Math.min(32, t - this.lastT); this.lastT = t; this.step(dt); this.draw(); this.rafId = requestAnimationFrame(this.frame); } };

  // ===== Simulation =====
  private step(dt: number) {
    const w = innerWidth, h = innerHeight;
    // pointer velocity
    const { x: px, y: py } = this.pointer;
    this.pointer.vx = (px - this.pointer.lastX) / Math.max(1, dt);
    this.pointer.vy = (py - this.pointer.lastY) / Math.max(1, dt);
    this.pointer.lastX = px; this.pointer.lastY = py;

    for (const b of this.blobs) {
      // size breathing
      b.phase += dt * 0.0010; const breathe = (Math.sin(b.phase) + 1) * 0.5; b._rb = b.r * (0.9 + 0.12 * breathe);

      // flow + up bias
      const swirl = this.flow(b.x * CFG.SWIRL_SCALE, (h - b.y) * CFG.SWIRL_SCALE, this.noiseSeed);
      b.vx += Math.cos(swirl) * CFG.SWIRL_STRENGTH * dt * 0.001;
      const upBias = this.reduceMotion ? 0.012 : 0.015;
      b.vy += (-upBias + Math.sin(swirl) * CFG.SWIRL_STRENGTH) * dt * 0.001;

      // pointer interaction
      if (this.pointer.active) {
        const dx = b.x - px, dy = b.y - py; const d2 = dx * dx + dy * dy; const r = b._rb * CFG.POINTER_RADIUS_SCALE; const r2 = r * r;
        if (d2 < r2) {
          const d = Math.max(Math.sqrt(d2), 1e-4); let fx = dx / d, fy = dy / d; if (this.pointer.attract) { fx = -fx; fy = -fy; }
          const strength = (1 - d2 / r2); const vmag = Math.hypot(this.pointer.vx, this.pointer.vy) * CFG.POINTER_VBOOST;
          b.vx += (fx * CFG.POINTER_STRENGTH + this.pointer.vx * 0.015) * strength + vmag * fx * 0.006;
          b.vy += (fy * CFG.POINTER_STRENGTH + this.pointer.vy * 0.015) * strength + vmag * fy * 0.006;
        }
      }

      // clamp
      b.vx = this.clamp(b.vx, -CFG.MAX_VX, CFG.MAX_VX);
      b.vy = this.clamp(b.vy, -CFG.MAX_VY_UP, CFG.MAX_VY_DOWN);

      // integrate
      const speed = this.reduceMotion ? CFG.SPEED_SCALE_REDUCED : CFG.SPEED_SCALE;
      b.x += b.vx * dt * speed; b.y += b.vy * dt * speed;

      // wrap
      const rb = b._rb; if (b.y < -rb) { b.y = h + rb; b.x += this.rand(-rb, rb); }
      if (b.x < -rb) b.x = w + rb; if (b.x > w + rb) b.x = -rb;
    }
    this.noiseSeed += dt * 0.000035;
  }

  // ===== Rendering =====
  private draw() {
    const ctx = this.ctx; const w = innerWidth, h = innerHeight;

    // trails veil
    ctx.save(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = this.reduceMotion ? 1 : CFG.TRAIL_ALPHA; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); ctx.restore();

    // vignette
    ctx.save();
    const vg = ctx.createRadialGradient(
      w * CFG.VIGNETTE_CENTER_X, h * CFG.VIGNETTE_CENTER_Y, Math.min(w, h) * 0.1,
      w * CFG.VIGNETTE_CENTER_X, h * CFG.VIGNETTE_CENTER_Y, Math.max(w, h) * 0.9
    );
    vg.addColorStop(0, 'rgba(255,255,255,0.015)'); vg.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h); ctx.restore();

    // blobs (additive)
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.blobs.length; i++) {
      const b = this.blobs[i]; const rb = b._rb;
      const hue = (this.palette(i * 0.17 + this.noiseSeed * 0.5 + b.hueShift) * 360) % 360;
      const grad = ctx.createRadialGradient(b.x, b.y, rb * 0.1, b.x, b.y, rb);
      grad.addColorStop(0.0, `hsla(${hue}, ${CFG.COLOR_S}%, ${CFG.COLOR_L0}%, 0.65)`);
      grad.addColorStop(0.5, `hsla(${(hue + CFG.COLOR_JITTER0) % 360}, ${CFG.COLOR_S}%, ${CFG.COLOR_L1}%, 0.16)`);
      grad.addColorStop(1.0, `hsla(${(hue + CFG.COLOR_JITTER1) % 360}, ${CFG.COLOR_S}%, ${CFG.COLOR_L2}%, 0.04)`);

      ctx.shadowColor = `hsla(${hue}, 100%, ${CFG.SHADOW_L}%, 0.45)`; ctx.shadowBlur = rb * 0.7;
      ctx.fillStyle = grad; ctx.beginPath(); ctx.ellipse(b.x, b.y, rb * 1.03, rb * 0.90, Math.sin(b.phase) * 0.5, 0, Math.PI * 2); ctx.fill();

      // inner highlight
      ctx.shadowBlur = 0; ctx.globalAlpha = 0.18; ctx.fillStyle = `hsla(${hue}, 100%, 88%, 0.10)`;
      ctx.beginPath(); ctx.arc(b.x, b.y - rb * 0.18, rb * 0.32, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();

    if (!this.reduceMotion) this.applyGrain(ctx, w, h, CFG.GRAIN_STRENGTH);
  }

  // ===== Helpers =====
  private flow(x: number, y: number, seed: number) { const n = this.fract(Math.sin((x * 127.1 + y * 311.7 + seed * 53.3)) * 43758.5453123); return n * Math.PI * 2; }
  private fract(n: number) { return n - Math.floor(n); }
  private palette(t: number) { return 0.5 + 0.5 * Math.cos(2 * Math.PI * (t % 1)); }
  private rand(min: number, max: number) { return min + Math.random() * (max - min); }
  private clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }

  private applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.05) {
    const size = 140; const tile = document.createElement('canvas'); tile.width = size; tile.height = size;
    const tctx = tile.getContext('2d')!; const img = tctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (Math.random() * 2 - 1) * 128 * strength; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 12; }
    tctx.putImageData(img, 0, 0); const pattern = ctx.createPattern(tile, 'repeat')!;
    ctx.globalCompositeOperation = 'overlay'; ctx.fillStyle = pattern; ctx.fillRect(0, 0, w, h); ctx.globalCompositeOperation = 'source-over';
  }

  // ===== Pointer =====
  private onPointerMove = (ev: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect(); this.pointer.x = ev.clientX - rect.left; this.pointer.y = ev.clientY - rect.top; this.pointer.active = true;
  };
  private onPointerDown = (ev: PointerEvent) => {
    this.onPointerMove(ev);
    const side = Math.min(innerWidth, innerHeight);
    for (let i = 0; i < 2; i++) {
      const r = this.rand(CFG.BURST_MIN, CFG.BURST_MAX) * side;
      this.blobs.push({ x: this.pointer.x + this.rand(-6, 6), y: this.pointer.y + this.rand(-6, 6), vx: this.rand(-CFG.BURST_VX, CFG.BURST_VX), vy: this.rand(CFG.BURST_VY_MIN, CFG.BURST_VY_MAX), r, _rb: r, phase: Math.random() * Math.PI * 2, hueShift: Math.random() } as BlobBall);
    }
  };
  private onPointerUp = () => { this.pointer.active = false; };
  private onKey = (e: KeyboardEvent) => { this.pointer.attract = e.altKey; };

  // ===== Scroll progress =====
  @HostListener('window:scroll', [])
  trackScroll() {
    const el = document.getElementById('scroll-progress'); if (!el) return;
    const dh = document.documentElement; const max = dh.scrollHeight - dh.clientHeight; const p = max > 0 ? Math.min(1, dh.scrollTop / max) : 0;
    el.style.setProperty('--w', (p * 100).toFixed(2) + '%');
  }
}
