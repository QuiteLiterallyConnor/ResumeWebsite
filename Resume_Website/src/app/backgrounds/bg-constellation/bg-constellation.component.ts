// src/app/backgrounds/bg-constellation/bg-constellation.component.ts
import { AfterViewInit, Component, ElementRef, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  alpha: number;
  driftAngle: number;
};

@Component({
  selector: 'app-bg-constellation',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bg-constellation.component.html',
  styleUrls: ['./bg-constellation.component.scss']
})
export class BgConstellationComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvasRef', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D;
  private dpr = Math.min(2, window.devicePixelRatio || 1);
  private rafId: number | null = null;

  private particles: Particle[] = [];
  private mouse: { x: number | null; y: number | null } = { x: null, y: null };

  private readonly SETTINGS = {
    PARTICLE_COUNT: 150,
    PARTICLE_SIZE_MIN: 1,
    PARTICLE_SIZE_MAX: 5,
    PARTICLE_ALPHA_MIN: 0.1,
    PARTICLE_ALPHA_MAX: 0.2,
    CONNECTION_DISTANCE: 200,
    CONNECTION_LINE_WIDTH: 1.5,
    CONNECTION_LINE_ALPHA: 0.12,
    MOUSE_FORCE_RADIUS: 150,
    MOUSE_FORCE_STRENGTH: 0.15,
    VELOCITY_DAMPING: 0.90,
    GLOW_BLUR_MAX: 10,
    WANDER_SPEED: 0.5,
    WANDER_NUDGE: 0.01
  };

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    this.ctx = ctx;

    this.resizeCanvas();
    this.initParticles();

    // Events (outside Angular for perf)
    this.zone.runOutsideAngular(() => {
      window.addEventListener('resize', this.onResize, { passive: true });
      window.addEventListener('mousemove', this.onMouseMove, { passive: true });
      window.addEventListener('mouseleave', this.onMouseLeave, { passive: true });

      // Respect prefers-reduced-motion with a static frame
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) {
        this.drawFrame();
      } else {
        this.rafId = requestAnimationFrame(this.animate);
      }
    });
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseleave', this.onMouseLeave);
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
  }

  /* ---------- Events ---------- */
  private onResize = () => {
    this.resizeCanvas();
    // keep count proportional to area (optional)
    const area = innerWidth * innerHeight;
    const base = this.SETTINGS.PARTICLE_COUNT;
    const scaled = Math.round(base * Math.min(1.5, Math.max(0.6, area / (1920 * 1080))));
    this.SETTINGS.PARTICLE_COUNT = scaled;
    this.initParticles();
    this.drawFrame();
  };

  private onMouseMove = (e: MouseEvent) => {
    this.mouse.x = e.clientX;
    this.mouse.y = e.clientY;
  };
  private onMouseLeave = () => {
    this.mouse.x = null;
    this.mouse.y = null;
  };

  /* ---------- Setup ---------- */
  private resizeCanvas(): void {
    const c = this.canvasRef.nativeElement;
    c.width = Math.ceil(window.innerWidth * this.dpr);
    c.height = Math.ceil(window.innerHeight * this.dpr);
    c.style.width = window.innerWidth + 'px';
    c.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private initParticles(): void {
    const {
      PARTICLE_COUNT,
      PARTICLE_SIZE_MIN,
      PARTICLE_SIZE_MAX,
      PARTICLE_ALPHA_MIN,
      PARTICLE_ALPHA_MAX,
      WANDER_SPEED
    } = this.SETTINGS;

    const w = window.innerWidth;
    const h = window.innerHeight;

    this.particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * WANDER_SPEED,
      vy: (Math.random() - 0.5) * WANDER_SPEED,
      size: Math.random() * (PARTICLE_SIZE_MAX - PARTICLE_SIZE_MIN) + PARTICLE_SIZE_MIN,
      alpha: Math.random() * (PARTICLE_ALPHA_MAX - PARTICLE_ALPHA_MIN) + PARTICLE_ALPHA_MIN,
      driftAngle: Math.random() * Math.PI * 2
    }));
  }

  /* ---------- Loop ---------- */
  private animate = () => {
    this.step();
    this.drawFrame();
    this.rafId = requestAnimationFrame(this.animate);
  };

  private step(): void {
    const {
      MOUSE_FORCE_RADIUS,
      MOUSE_FORCE_STRENGTH,
      VELOCITY_DAMPING,
      WANDER_NUDGE
    } = this.SETTINGS;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const mx = this.mouse.x, my = this.mouse.y;

    for (const p of this.particles) {
      // Mouse interaction
      if (mx !== null && my !== null) {
        const dx = p.x - mx;
        const dy = p.y - my;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_FORCE_RADIUS) {
          const force = (MOUSE_FORCE_RADIUS - dist) / MOUSE_FORCE_RADIUS;
          const angle = Math.atan2(dy, dx);
          p.vx += Math.cos(angle) * force * MOUSE_FORCE_STRENGTH;
          p.vy += Math.sin(angle) * force * MOUSE_FORCE_STRENGTH;
        }
      }

      // Random drift
      if (Math.random() < 0.02) {
        p.driftAngle += (Math.random() - 0.5) * 0.3;
      }
      p.vx += Math.cos(p.driftAngle) * WANDER_NUDGE;
      p.vy += Math.sin(p.driftAngle) * WANDER_NUDGE;

      // Integrate
      p.x += p.vx;
      p.y += p.vy;

      // Wrap
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;

      // Damping
      p.vx *= VELOCITY_DAMPING;
      p.vy *= VELOCITY_DAMPING;
    }
  }

  private drawFrame(): void {
    const {
      CONNECTION_DISTANCE,
      CONNECTION_LINE_WIDTH,
      CONNECTION_LINE_ALPHA,
      GLOW_BLUR_MAX
    } = this.SETTINGS;

    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Background (deep space)
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, w, h);

    // Connections
    ctx.lineWidth = CONNECTION_LINE_WIDTH;
    for (let i = 0; i < this.particles.length; i++) {
      const a = this.particles[i];
      for (let j = i + 1; j < this.particles.length; j++) {
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist < CONNECTION_DISTANCE) {
          ctx.globalAlpha = (CONNECTION_DISTANCE - dist) / CONNECTION_DISTANCE;
          ctx.strokeStyle = `rgba(255,255,255,${CONNECTION_LINE_ALPHA})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Stars
    for (const p of this.particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = GLOW_BLUR_MAX * 0.3;
      ctx.shadowColor = 'rgba(79,172,254,0.3)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
