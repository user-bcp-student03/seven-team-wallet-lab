import { Component, input } from '@angular/core';

interface Strand {
  readonly x: number;
  readonly color: string;
  readonly knots: readonly number[];
  readonly longKnot: number;
}

// Un hilo por color del logo; cada nudo es una posición vertical dentro del viewBox.
const STRANDS: readonly Strand[] = [
  { x: 14, color: '#2f8bf5', knots: [20, 25, 30, 37], longKnot: 54 },
  { x: 28, color: '#f5c518', knots: [18, 23, 28, 44, 49], longKnot: 58 },
  { x: 43, color: '#1fb455', knots: [16, 21, 26, 31, 36, 41, 52], longKnot: 59 },
  { x: 58, color: '#4ade80', knots: [18, 23, 28, 33, 38, 43, 48], longKnot: 55 },
  { x: 73, color: '#8b5cf6', knots: [17, 22, 27, 47], longKnot: 55 },
  { x: 88, color: '#ef2d56', knots: [20, 25, 30, 35, 40, 45, 50], longKnot: 57 },
];

@Component({
  selector: 'app-kipu-logo',
  template: `
    <svg
      viewBox="0 0 100 80"
      [attr.width]="size()"
      [attr.height]="size() * 0.8"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 8 C35 10 65 10 94 6" fill="none" stroke="#f3e6c4" stroke-width="2.2" stroke-linecap="round" />
      <circle cx="6" cy="8" r="3.4" fill="#f3e6c4" />
      @for (s of strands; track s.x) {
        <line [attr.x1]="s.x" y1="9" [attr.x2]="s.x" y2="68" [attr.stroke]="s.color" stroke-width="1.5" stroke-linecap="round" />
        @for (y of s.knots; track y) {
          <circle [attr.cx]="s.x" [attr.cy]="y" r="2" [attr.fill]="s.color" />
        }
        <rect [attr.x]="s.x - 2.2" [attr.y]="s.longKnot" width="4.4" height="7" rx="1.6" [attr.fill]="s.color" />
        <path
          [attr.d]="'M' + s.x + ' 68 L' + (s.x - 4) + ' 78 M' + s.x + ' 68 L' + s.x + ' 78 M' + s.x + ' 68 L' + (s.x + 4) + ' 78'"
          fill="none"
          [attr.stroke]="s.color"
          stroke-width="1.2"
          stroke-linecap="round"
        />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      line-height: 0;
    }
  `,
})
export class KipuLogo {
  readonly size = input(72);
  protected readonly strands = STRANDS;
}
