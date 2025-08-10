import {
  Component, ViewEncapsulation, AfterViewInit, OnDestroy, NgZone, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-background',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './background.component.html',
  styleUrls: ['./background.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BackgroundComponent implements AfterViewInit, OnDestroy {
  private rafId: number | null = null;
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private dpr = Math.min(2, window.devicePixelRatio || 1);
  private running = false;
  private lastT = 0;

  private blobs: BlobBall[] = [];
  private noiseSeed = Math.random() * 1000;

  // motion / pointer
  private reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private onReduceMotion = (e: MediaQueryListEvent) => {
    this.reduceMotion = e.matches;
    this.toggleAnimation(!this.reduceMotion);
  };
  private pointer = {
    active: false,
    x: 0, y: 0,
    vx: 0, vy: 0,
    lastX: 0, lastY: 0,
    attract: false // hold Alt to attract; default is repulse
  };

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    const mql = matchMedia('(prefers-reduced-motion: reduce)');
    mql.addEventListener?.('change', this.onReduceMotion);

    this.canvas = document.getElementById('fx-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d', { alpha: true }) as CanvasRenderingContext2D;
    if (!ctx) return;
    this.ctx = ctx;

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
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.ceil(w * this.dpr);
    this.canvas.height = Math.ceil(h * this.dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private seedBlobs() {
    const baseCount = 6; // fewer particles
    const densityBoost = Math.max(0, Math.min(1, (window.innerWidth * window.innerHeight) / (1600 * 900)));
    const count = Math.round(baseCount + densityBoost * 6); // capped boost

    const { innerWidth: w, innerHeight: h } = window;
    this.blobs = Array.from({ length: count }, () => {
      const side = Math.min(w, h);
      const r = this.randRange(side * 0.05, side * 0.11);
      const upSpeed = this.randRange(10, 18) / 1000; // slower upward drift
      return {
        x: Math.random() * w,
        y: this.randRange(h * 0.7, h + r),
        vx: this.randRange(-0.02, 0.02), // gentler lateral
        vy: -upSpeed,
        r,
        _rb: r,
        phase: Math.random() * Math.PI * 2,
        hueShift: Math.random()
      } as BlobBall;
    });
  }

  private toggleAnimation(shouldRun: boolean) {
    if (shouldRun && !this.running) {
      this.running = true;
      this.lastT = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
    } else if (!shouldRun && this.running) {
      this.running = false;
      if (this.rafId != null) cancelAnimationFrame(this.rafId);
      this.rafId = null;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private frame = (t: number) => {
    if (!this.running) return;
    const dt = Math.min(32, t - this.lastT);
    this.lastT = t;

    this.step(dt);
    this.draw();

    this.rafId = requestAnimationFrame(this.frame);
  };

  private step(dt: number) {
    const w = window.innerWidth;
    const h = window.innerHeight;

    // pointer velocity
    const px = this.pointer.x, py = this.pointer.y;
    this.pointer.vx = (px - this.pointer.lastX) / Math.max(1, dt);
    this.pointer.vy = (py - this.pointer.lastY) / Math.max(1, dt);
    this.pointer.lastX = px; this.pointer.lastY = py;

    for (const b of this.blobs) {
      // breathing size
      b.phase += dt * 0.0010; // slightly slower
      const breathe = (Math.sin(b.phase) + 1) * 0.5;
      b._rb = b.r * (0.9 + 0.12 * breathe);

      // upward drift + sideways swirl field
      const swirl = this.flow(b.x * 0.0007, (h - b.y) * 0.0007, this.noiseSeed);
      const swirlStrength = 0.018; // softer flow
      b.vx += Math.cos(swirl) * swirlStrength * dt * 0.001;
      const upBias = this.reduceMotion ? 0.012 : 0.015; // slower rise
      b.vy += (-upBias) * dt * 0.001 + Math.sin(swirl) * swirlStrength * dt * 0.001;

      // pointer interaction (gentler)
      if (this.pointer.active) {
        const dx = b.x - px;
        const dy = b.y - py;
        const d2 = dx * dx + dy * dy;
        const r = b._rb * 1.8; // smaller influence radius
        const r2 = r * r;
        if (d2 < r2) {
          const d = Math.max(Math.sqrt(d2), 0.0001);
          let fx = dx / d, fy = dy / d;
          if (this.pointer.attract) { fx = -fx; fy = -fy; }
          const strength = (1 - d2 / r2);
          const velocityBoost = (Math.hypot(this.pointer.vx, this.pointer.vy) * 0.10);
          b.vx += (fx * 0.10 + this.pointer.vx * 0.015) * strength + velocityBoost * fx * 0.006;
          b.vy += (fy * 0.10 + this.pointer.vy * 0.015) * strength + velocityBoost * fy * 0.006;
        }
      }

      // clamp velocity (tighter caps)
      const maxVX = 0.12, maxVYUp = 0.22, maxVYDown = 0.05;
      b.vx = Math.max(-maxVX, Math.min(maxVX, b.vx));
      b.vy = Math.max(-maxVYUp, Math.min(maxVYDown, b.vy));

      // integrate
      const speedScale = this.reduceMotion ? 0.55 : 0.85; // overall slowdown
      b.x += b.vx * dt * speedScale;
      b.y += b.vy * dt * speedScale;

      // wrap edges: top→bottom; sides wrap horizontally
      const rb = b._rb;
      if (b.y < -rb) { b.y = h + rb; b.x += this.randRange(-rb, rb); }
      if (b.x < -rb) b.x = w + rb;
      if (b.x > w + rb) b.x = -rb;
    }

    this.noiseSeed += dt * 0.000035; // slower evolution
  }

  private draw() {
    const ctx = this.ctx;
    const { innerWidth: w, innerHeight: h } = window;

    // trails with black veil
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = this.reduceMotion ? 1 : 0.16; // slightly stronger veil → dimmer, smoother trails
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // subtle vignette
    ctx.save();
    const vignette = ctx.createRadialGradient(
      w * 0.5, h * 0.55, Math.min(w, h) * 0.1,
      w * 0.5, h * 0.55, Math.max(w, h) * 0.9
    );
    vignette.addColorStop(0, 'rgba(255,255,255,0.015)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // additive blobs (less bright)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.blobs.length; i++) {
      const b = this.blobs[i];
      const rb = b._rb;
      const hue = (this.palette(i * 0.17 + this.noiseSeed * 0.5 + b.hueShift) * 360) % 360;

      const grad = ctx.createRadialGradient(b.x, b.y, rb * 0.1, b.x, b.y, rb);
      grad.addColorStop(0.0, `hsla(${hue}, 85%, 58%, 0.65)`); // dimmer core
      grad.addColorStop(0.5, `hsla(${(hue + 10) % 360}, 85%, 50%, 0.16)`);
      grad.addColorStop(1.0, `hsla(${(hue + 22) % 360}, 85%, 42%, 0.04)`);

      ctx.shadowColor = `hsla(${hue}, 100%, 68%, 0.45)`; // softer glow
      ctx.shadowBlur = rb * 0.7;

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, rb * 1.03, rb * 0.90, Math.sin(b.phase) * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // subtle inner highlight
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = `hsla(${hue}, 100%, 88%, 0.10)`;
      ctx.beginPath();
      ctx.arc(b.x, b.y - rb * 0.18, rb * 0.32, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // fine grain for texture (still subtle)
    if (!this.reduceMotion) this.applyGrain(ctx, w, h, 0.022);
  }

  private flow(x: number, y: number, seed: number) {
    const n = this.fract(Math.sin((x * 127.1 + y * 311.7 + seed * 53.3)) * 43758.5453123);
    return n * Math.PI * 2;
  }
  private fract(n: number) { return n - Math.floor(n); }

  private palette(t: number) {
    return 0.5 + 0.5 * Math.cos(2 * Math.PI * (t % 1));
  }

  private applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.05) {
    const size = 140;
    const tile = document.createElement('canvas');
    tile.width = size; tile.height = size;
    const tctx = tile.getContext('2d')!;
    const img = tctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() * 2 - 1) * 128 * strength;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 12;
    }
    tctx.putImageData(img, 0, 0);
    const pattern = ctx.createPattern(tile, 'repeat')!;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  private randRange(min: number, max: number) { return min + Math.random() * (max - min); }

  // Pointer handlers
  private onPointerMove = (ev: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = (ev.clientX - rect.left);
    this.pointer.y = (ev.clientY - rect.top);
    this.pointer.active = true;
  };
  private onPointerDown = (ev: PointerEvent) => {
    this.onPointerMove(ev);
    // softer burst: fewer, smaller, slower
    const w = window.innerWidth, h = window.innerHeight;
    for (let i = 0; i < 2; i++) {
      const r = this.randRange(Math.min(w, h) * 0.018, Math.min(w, h) * 0.04);
      this.blobs.push({
        x: this.pointer.x + this.randRange(-6, 6),
        y: this.pointer.y + this.randRange(-6, 6),
        vx: this.randRange(-0.08, 0.08),
        vy: this.randRange(-0.22, -0.10),
        r, _rb: r, phase: Math.random() * Math.PI * 2, hueShift: Math.random()
      } as BlobBall);
    }
  };
  private onPointerUp = () => { this.pointer.active = false; };
  private onKey = (e: KeyboardEvent) => { this.pointer.attract = e.altKey; };

  @HostListener('window:scroll', [])
  trackScroll() {
    const el = document.getElementById('scroll-progress');
    if (!el) return;
    const dh = document.documentElement;
    const max = dh.scrollHeight - dh.clientHeight;
    const p = max > 0 ? Math.min(1, dh.scrollTop / max) : 0;
    el.style.setProperty('--w', (p * 100).toFixed(2) + '%');
  }
}

type BlobBall = {
  x: number; y: number;
  vx: number; vy: number;
  r: number; _rb: number;
  phase: number;
  hueShift: number;
};
