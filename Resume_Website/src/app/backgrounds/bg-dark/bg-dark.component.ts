import { Component, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bg-dark',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bg-dark.component.html',
  styleUrls: ['./bg-dark.component.scss']
})
export class BgDarkComponent implements OnDestroy {
  private rafId = 0;
  private t = 0;

  constructor(private el: ElementRef<HTMLElement>) {
    // Start center
    this.setVar('--mx', '50vw');
    this.setVar('--my', '50vh');
    this.animate();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  @HostListener('pointermove', ['$event'])
  onMove(e: PointerEvent) {
    const x = `${e.clientX}px`;
    const y = `${e.clientY}px`;
    this.setVar('--mx', x);
    this.setVar('--my', y);

    // Parallax factors (-1..1)
    const rx = (e.clientX / window.innerWidth) * 2 - 1;
    const ry = (e.clientY / window.innerHeight) * 2 - 1;
    this.setVar('--parx', (rx * 20).toFixed(3) + 'px'); // foreground
    this.setVar('--pary', (ry * 20).toFixed(3) + 'px');
    this.setVar('--parx2', (rx * 10).toFixed(3) + 'px'); // midground
    this.setVar('--pary2', (ry * 10).toFixed(3) + 'px');
  }

  @HostListener('pointerleave')
  onLeave() {
    // Ease back to center
    this.setVar('--mx', '50vw');
    this.setVar('--my', '50vh');
    this.setVar('--parx', '0px');
    this.setVar('--pary', '0px');
    this.setVar('--parx2', '0px');
    this.setVar('--pary2', '0px');
  }

  private animate = () => {
    this.t += 0.005; // master time
    // Rotate aurora and drift noise
    this.setVar('--spin', `${(this.t * 40) % 360}deg`);
    this.setVar('--noiseX', `${(Math.sin(this.t) * 200).toFixed(2)}px`);
    this.setVar('--noiseY', `${(Math.cos(this.t * 0.8) * 200).toFixed(2)}px`);
    this.setVar('--glow', `${(Math.sin(this.t * 2) * 2 + 4).toFixed(2)}vmax`);

    this.rafId = requestAnimationFrame(this.animate);
  };

  private setVar(name: string, value: string) {
    (this.el.nativeElement as HTMLElement).style.setProperty(name, value);
  }
}
