import { AfterViewInit, Component, ElementRef, HostListener, Renderer2, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { HeaderComponent } from './header/header.component';
import { BgDarkComponent } from './backgrounds/bg-dark/bg-dark.component';
import { BgLightComponent } from './backgrounds/bg-light/bg-light.component';
import { BgLavaComponent } from './backgrounds/bg-lava/bg-lava.component';
import { BgConstellationComponent } from './backgrounds/bg-constellation/bg-constellation.component';
import { DataComponent, Me, ExperienceItem, ProjectItem, TestimonialItem, UIStrings } from './data/data.component';

type HeaderSection = 'about'|'experience'|'projects'|'testimonials';
type Command = { k: string; t: string; h: string; fn: () => void };
type Theme = 'dark'|'light'|'lava'|'constellation';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    HeaderComponent,
    BgDarkComponent,
    BgLightComponent,
    BgConstellationComponent,
    BgLavaComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {
  year = new Date().getFullYear();
  openStep: number | null = 0;
  activeSection: HeaderSection = 'about';
  theme: Theme = 'dark';

  // data from provider
  me!: Me;
  experience!: ExperienceItem[];
  projects!: ProjectItem[];
  testimonials!: TestimonialItem[];
  marqueeSkills!: string[];
  ui!: UIStrings;

  @ViewChild('projectsTrack') projectsTrack?: ElementRef<HTMLDivElement>;
  @ViewChild('paletteInput') paletteInput?: ElementRef<HTMLInputElement>;

  paletteOpen = false;
  paletteQuery = '';
  paletteIndex = 0;

  backdropOn = true;

  // --- Contact form state ---
  contact = { name: '', email: '', message: '' };
  contactLoading = false;
  contactSuccess = false;
  contactError = '';

  commands: Command[] = [
    { k:'Go',     t:'About',           h:'Navigate to about',        fn: () => this.scrollTo('#about') },
    { k:'Go',     t:'Experience',      h:'Navigate to experience',    fn: () => this.scrollTo('#experience') },
    { k:'Go',     t:'Projects',        h:'Navigate to projects',      fn: () => this.scrollTo('#projects') },
    { k:'Toggle', t:'Theme',           h:'Cycle theme',               fn: () => this.toggleTheme() },
    { k:'Toggle', t:'Backdrop',        h:'Stars / glows on/off',      fn: () => this.toggleBackdrop() },
    { k:'Action', t:'Download Resume', h:'Grab a copy of my CV',      fn: () => this.triggerCV() },
    { k:'Copy',   t:'Email',           h: '',                         fn: () => this.copy(this.me.email, new Event('copy')) },
  ];

  constructor(
    private el: ElementRef<HTMLElement>,
    private r: Renderer2,
    private data: DataComponent,
    private http: HttpClient
  ) {
    this.me = data.me;
    this.experience = data.experience;
    this.projects = data.projects;
    this.testimonials = data.testimonials;
    this.marqueeSkills = data.marqueeSkills;
    this.ui = data.ui;

    this.commands = this.commands.map(c => {
      if (c.t === 'Email') return { ...c, h: this.me.email };
      return c;
    });
  }

  /* ---------- THEME ---------- */
  toggleTheme() {
    const order: Theme[] = ['dark','light','lava','constellation'];
    const next = order[(order.indexOf(this.theme) + 1) % order.length];
    this.theme = next;
    localStorage.setItem('themeName', this.theme);
    this.updateThemeClass();
  }
  onTheme(mode: Theme) {
    this.theme = mode;
    localStorage.setItem('themeName', this.theme);
    this.updateThemeClass();
  }
  initTheme() {
    const stored = localStorage.getItem('themeName') as Theme | null;
    this.theme = stored ?? 'dark';
    this.updateThemeClass();
  }
  updateThemeClass() {
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-lava', 'theme-constellation');
    document.documentElement.classList.add(`theme-${this.theme}`);
  }

  /* ---------- BACKDROP ---------- */
  toggleBackdrop() {
    this.backdropOn = !this.backdropOn;
    document.documentElement.classList.toggle('backdrop-off', !this.backdropOn);
  }

  /* ---------- CARD FX ---------- */
  tilt(ev: MouseEvent) {
    const el = ev.currentTarget as HTMLElement;
    const b = el.getBoundingClientRect();
    const px = (ev.clientX - b.left) / b.width - 0.5;
    const py = (ev.clientY - b.top) / b.height - 0.5;
    el.style.setProperty('--ry', `${px * 8}deg`);
    el.style.setProperty('--rx', `${-py * 8}deg`);
    el.style.setProperty('--spot-x', `${px * 60 + 50}%`);
    el.style.setProperty('--spot-y', `${py * 60 + 50}%`);
    el.style.setProperty('--spot-opacity', '1');
  }

  resetTilt(ev: MouseEvent) {
    const el = ev.currentTarget as HTMLElement;
    el.style.setProperty('--ry', '0deg');
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--spot-opacity', '0');
    el.style.setProperty('--spot-x', '50%');
    el.style.setProperty('--spot-y', '50%');
  }

  magnetic(ev: MouseEvent) {
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const dx = (ev.clientX - (rect.left + rect.width/2)) * 0.08;
    const dy = (ev.clientY - (rect.top + rect.height/2)) * 0.08;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  unmagnetic(ev: MouseEvent) { (ev.currentTarget as HTMLElement).style.transform = ''; }
  ripple(ev: MouseEvent) {
    const btn = (ev.currentTarget as HTMLElement).closest('.btn') as HTMLElement;
    const r = btn.getBoundingClientRect();
    const x = ev.clientX - r.left, y = ev.clientY - r.top;
    const rip = btn.querySelector('.ripple') as HTMLElement;
    rip.style.setProperty('--x', `${x}px`);
    rip.style.setProperty('--y', `${y}px`);
    (rip as any).style.setProperty('left', x + 'px');
    (rip as any).style.setProperty('top', y + 'px');
    btn.classList.remove('rippling'); void btn.offsetWidth; btn.classList.add('rippling');
    setTimeout(() => btn.classList.remove('rippling'), 600);
  }

  /* ---------- EXPERIENCE ---------- */
  toggleStep(i: number) { this.openStep = this.openStep === i ? null : i; }

  /* ---------- CAROUSEL ---------- */
  dragging = false; dragStartX = 0; scrollStartX = 0; velX = 0; lastX = 0; raf?: number;
  startDrag(e: MouseEvent | TouchEvent) {
    this.dragging = true; 
    this.dragStartX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    if (!this.projectsTrack) return;
    this.scrollStartX = this.projectsTrack.nativeElement.scrollLeft;
    this.lastX = this.dragStartX;
    cancelAnimationFrame(this.raf!);
  }
  
  onDrag(e: MouseEvent | TouchEvent) {
    if (!this.dragging || !this.projectsTrack) return;
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
    const dx = clientX - this.dragStartX;
    const el = this.projectsTrack.nativeElement;
    el.scrollLeft = this.scrollStartX - dx;
    this.velX = clientX - this.lastX; 
    this.lastX = clientX;
  }
  
  endDrag() {
    if (!this.dragging || !this.projectsTrack) return;
    this.dragging = false;
    const el = this.projectsTrack.nativeElement;
    const momentum = () => {
      el.scrollLeft -= this.velX;
      this.velX *= 0.95;
      if (Math.abs(this.velX) > 0.5) this.raf = requestAnimationFrame(momentum);
    };
    this.raf = requestAnimationFrame(momentum);
  }
  
  // Touch event handlers
  startTouch(e: TouchEvent) {
    if (e.touches.length === 1) {
      e.preventDefault(); // Prevent page scrolling while swiping carousel
      this.startDrag(e);
    }
  }
  
  onTouch(e: TouchEvent) {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.onDrag(e);
    }
  }
  
  endTouch() {
    this.endDrag();
  }
  wheelScroll(e: WheelEvent) {
    if (!this.projectsTrack) return;
    e.preventDefault();
    this.projectsTrack.nativeElement.scrollLeft += e.deltaY;
  }

  /* ---------- COMMAND PALETTE ---------- */
  openPalette() { this.paletteOpen = true; setTimeout(()=> this.paletteInput?.nativeElement.focus(), 0); }
  closePalette() { this.paletteOpen = false; this.paletteQuery=''; this.paletteIndex = 0; }
  filteredCommands() {
    const q = this.paletteQuery.toLowerCase();
    return this.commands.filter(c => (c.t + c.k + c.h).toLowerCase().includes(q));
  }
  paletteKey(ev: KeyboardEvent) {
    const items = this.filteredCommands();
    if (ev.key === 'ArrowDown') { this.paletteIndex = Math.min(this.paletteIndex+1, items.length-1); ev.preventDefault(); }
    if (ev.key === 'ArrowUp')   { this.paletteIndex = Math.max(this.paletteIndex-1, 0); ev.preventDefault(); }
    if (ev.key === 'Enter')     { const cmd = items[this.paletteIndex]; cmd && this.runCommand(cmd); }
    if (ev.key === 'Escape')    { this.closePalette(); }
  }
  runCommand(cmd: Command) { this.closePalette(); cmd.fn(); }
  triggerCV() {
    const link = document.createElement('a');
    // Remove 'public/' prefix if present, as Angular serves these files from root
    const path = this.ui.hero.cvPath.replace(/^public\//, '/');
    link.href = path;
    link.download = this.ui.hero.cvPath.split('/').pop() || '';
    link.click();
    this.confetti();
  }

  /* ---------- COPY TO CLIPBOARD ---------- */
  async copy(text: string, ev: Event) {
    try {
      await navigator.clipboard.writeText(text);
      const el = (ev && (ev as any).currentTarget) as HTMLElement | undefined;
      if (el) {
        el.classList.add('copied');
        setTimeout(()=> el.classList.remove('copied'), 900);
      }
    } catch {}
  }

  /* ---------- KEYBOARD HOOKS ---------- */
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); this.openPalette(); return; }
    if (e.key === 'Escape' && this.paletteOpen) { this.closePalette(); return; }
    if (!this.projectsTrack) return;
    if (['ArrowLeft','ArrowRight'].includes(e.key) && this.isInViewport(this.projectsTrack.nativeElement)) {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 320 : -320;
      this.projectsTrack.nativeElement.scrollBy({ left: delta, behavior: 'smooth' });
    }
  }

  confetti(_?: any) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas');
    Object.assign(c.style, { position: 'fixed', inset: '0', zIndex: '90', pointerEvents: 'none' } as CSSStyleDeclaration);
    document.body.appendChild(c);

    const ctx = c.getContext('2d')!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      c.width = Math.ceil(innerWidth * dpr);
      c.height = Math.ceil(innerHeight * dpr);
      c.style.width = innerWidth + 'px';
      c.style.height = innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const onResize = () => resize();
    addEventListener('resize', onResize, { passive: true });

    type P = { x:number; y:number; vx:number; vy:number; size:number; color:string; life:number; };
    const parts: P[] = [];
    const make = (): P => {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4;
      return { x: innerWidth/2, y: innerHeight*0.25, vx: Math.cos(a)*s, vy: Math.sin(a)*s-2,
               size: 3 + Math.random()*5, color: `hsl(${Math.random()*360},80%,60%)`, life: 120 };
    };
    for (let i=0;i<140;i++) parts.push(make());

    let raf = 0;
    const loop = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(255,255,255,.05)';
      for (let i=0;i<24;i++) ctx.fillRect(Math.random()*innerWidth, Math.random()*innerHeight, 1, 1);
      ctx.globalCompositeOperation = 'source-over';

      for (let i=parts.length-1;i>=0;i--) {
        const p = parts[i];
        p.vy += 0.05; p.x += p.vx; p.y += p.vy; p.life--;
        ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
        if (p.life <= 0) parts.splice(i, 1);
      }

      if (parts.length) raf = requestAnimationFrame(loop);
      else {
        cancelAnimationFrame(raf);
        removeEventListener('resize', onResize);
        c.remove();
      }
    };
    raf = requestAnimationFrame(loop);
  }

  /* ---------- SCROLL ---------- */
  @HostListener('window:scroll')
  onScroll() {
    document.documentElement.classList.toggle('is-scrolled', window.scrollY > 8);

    const sections: [HeaderSection, HTMLElement][] = [];
    const ids: HeaderSection[] = ['about','experience','projects','testimonials'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) sections.push([id, el]);
    }

    const y = window.scrollY + innerHeight * 0.35;
    for (const [id, el] of sections) {
      const top = el.offsetTop, bottom = top + el.offsetHeight;
      if (y >= top && y < bottom) { this.activeSection = id; break; }
    }
    const progress = Math.min(1, window.scrollY / (document.body.scrollHeight - innerHeight));
    (document.getElementById('scroll-progress') as HTMLElement)?.style.setProperty('--w', `${progress*100}vw`);

    document.documentElement.classList.toggle('show-top', window.scrollY > innerHeight * 0.5);
  }

  ngAfterViewInit() {
    this.initTheme();
    this.onScroll();
    this.initRevealObserver();
  }

  /* ---------- Reveal-on-scroll ---------- */
  initRevealObserver() {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) e.target.classList.add('is-visible');
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  /* ---------- Helpers ---------- */
  scrollTo(sel: string) {
    document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  isInViewport(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0;
  }

  /* ---------- Contact submit ---------- */
  submitContact() {
    if (this.contactLoading) return;

    if (!this.contact.name || !this.contact.email || !this.contact.message) {
      this.contactError = 'Please fill out all fields.';
      this.contactSuccess = false;
      return;
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.contact.email)) {
      this.contactError = 'Please enter a valid email address.';
      this.contactSuccess = false;
      return;
    }

    this.contactLoading = true;
    this.contactError = '';
    this.contactSuccess = false;

    this.http.post('/api/contact', this.contact, {
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: () => {
        this.contactSuccess = true;
        this.contact = { name: '', email: '', message: '' };
      },
      error: () => {
        this.contactError = 'Sorry—something went wrong sending your message.';
      }
    }).add(() => {
      this.contactLoading = false;
    });
  }
}
