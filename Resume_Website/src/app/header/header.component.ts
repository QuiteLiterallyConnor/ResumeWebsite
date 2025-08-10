import {
  AfterViewInit, Component, ElementRef, EventEmitter, HostListener,
  Input, OnChanges, Output, SimpleChanges, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

type Section = 'about'|'experience'|'projects'|'testimonials';
export type Theme = 'dark'|'light'|'lava'|'constellation';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements AfterViewInit, OnChanges {
  @Input() activeSection: Section = 'about';

  @Output() setTheme = new EventEmitter<Theme>();
  @Output() toggleTheme = new EventEmitter<void>();
  @Output() openPalette = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<string>();

  @ViewChild('navRef') navRef?: ElementRef<HTMLElement>;
  navInkTransform = 'translateX(0)';
  scrollProgress = 0; // 0..1

  // Default to dark theme
  @Input() currentTheme: Theme = 'dark';

  ngAfterViewInit() {
    this.positionInkToActive();
    this.updateScrollProgress();
  }

  ngOnChanges(_: SimpleChanges) {
    setTimeout(() => this.positionInkToActive());
  }

  @HostListener('window:resize') onResize() { this.positionInkToActive(); }
  @HostListener('window:scroll') onScroll() { this.updateScrollProgress(); }

  private updateScrollProgress() {
    const doc = document.documentElement;
    const scrollTop = doc.scrollTop || document.body.scrollTop || 0;
    const scrollHeight = (doc.scrollHeight - doc.clientHeight) || 1;
    this.scrollProgress = Math.min(1, Math.max(0, scrollTop / scrollHeight));
  }

  onNavMove(ev: MouseEvent) {
    const nav = ev.currentTarget as HTMLElement;
    const links = Array.from(nav.querySelectorAll('a'));
    const over = links.find(a => {
      const r = a.getBoundingClientRect();
      return ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    });
    if (!over) return;
    const navRect = nav.getBoundingClientRect();
    const r = over.getBoundingClientRect();
    const x = r.left - navRect.left;
    const w = r.width;
    this.navInkTransform = `translateX(${x}px) scaleX(${w/60})`;
  }

  onLinkClick(ev: MouseEvent, id: Section) {
    ev.preventDefault();
    this.navigate.emit('#' + id);
  }

  private positionInkToActive() {
    const nav = this.navRef?.nativeElement;
    if (!nav) return;
    const active = nav.querySelector(`a[data-id="${this.activeSection}"]`) as HTMLElement | null;
    if (!active) return;
    const navRect = nav.getBoundingClientRect();
    const r = active.getBoundingClientRect();
    const x = r.left - navRect.left;
    const w = r.width;
    this.navInkTransform = `translateX(${x}px) scaleX(${w/60})`;
  }

  onThemeChange(e: Event) {
    const val = (e.target as HTMLSelectElement | null)?.value as Theme | undefined;
    if (val) {
      this.currentTheme = val;
      this.setTheme.emit(val);
    }
  }
}
