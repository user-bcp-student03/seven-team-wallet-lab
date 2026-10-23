import { Injectable, signal } from '@angular/core';

export interface Toast {
  kind: 'ok' | 'error';
  text: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly message = signal<Toast | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  show(text: string, kind: Toast['kind'] = 'ok'): void {
    this.message.set({ kind, text });
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.message.set(null), 4000);
  }
}
