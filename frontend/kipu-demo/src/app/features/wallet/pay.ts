import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { PaymentDraftService } from '../../core/payment-draft.service';
import { SAMPLE_QR_PAYLOAD } from '../../core/mock-data';
import { QrError, QrService, ResolvedQr } from '../../core/qr.service';
import { PenPipe } from '../../shared/pipes';

const QR_MESSAGES: Record<QrError['code'], string> = {
  INVALID: 'Este código no es válido para la wallet. Escanea o pega un código QR de cobro.',
  NOT_FOUND: 'No encontramos este cobro. Pide al comercio que genere un QR nuevo.',
  ALREADY_PAID: 'Este cobro ya fue pagado. No se hará ningún cobro adicional.',
  EXPIRED: 'Este QR expiró. Pide al comercio que genere uno nuevo.',
  OWN_CHARGE: 'No puedes pagar un cobro generado por ti mismo.',
};

@Component({
  selector: 'app-pay',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, PenPipe],
  template: `
    <p class="muted center">Escanea el código QR · la cámara no está habilitada en la demo</p>

    <div class="scan">
      <span class="scan__corner scan__corner--tl"></span>
      <span class="scan__corner scan__corner--tr"></span>
      <span class="scan__corner scan__corner--bl"></span>
      <span class="scan__corner scan__corner--br"></span>
      @if (sampleQr(); as src) {
        <img [src]="src" alt="Código QR de ejemplo del comercio Bodega Don Carlos" />
      }
    </div>

    <button mat-stroked-button type="button" class="wl-btn wl-btn--ghost" (click)="read(samplePayload)">
      Escanear código de ejemplo
    </button>

    <form class="manual" [formGroup]="form" (ngSubmit)="read(form.getRawValue().code)">
      <mat-form-field appearance="outline" subscriptSizing="dynamic">
        <mat-label>Código QR de otro usuario</mat-label>
        <input matInput formControlName="code" autocomplete="off" placeholder="WALLET-MOCK:QR:…" />
      </mat-form-field>
      <button mat-stroked-button type="submit" class="wl-btn wl-btn--ghost">Leer</button>
    </form>

    @if (error()) {
      <p class="alert" role="alert">{{ error() }}</p>
    }

    @if (found(); as f) {
      <section class="quick" aria-label="Pago detectado">
        <div class="row">
          <span class="avatar" aria-hidden="true">{{ f.destination.name[0] }}</span>
          <div class="quick__who">
            <span class="quick__label">Pagar a</span>
            <strong>{{ f.destination.name }}</strong>
          </div>
          <strong>{{ f.amountCents | pen }}</strong>
        </div>
        <button mat-flat-button type="button" class="wl-btn wl-btn--primary" (click)="confirm(f)">Confirmar pago</button>
      </section>
    }
  `,
  styles: `
    .scan {
      position: relative;
      align-self: center;
      box-sizing: border-box;
      width: 168px;
      height: 168px;
      padding: 12px;
    }

    .manual {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: start;
      gap: 8px;
    }

    .manual .wl-btn.mat-mdc-button-base {
      width: auto;
      min-width: 72px;
      margin-top: 4px;
    }

    .scan img {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: 6px;
    }

    .scan__corner {
      position: absolute;
      width: 24px;
      height: 24px;
      border: 0 solid var(--wl-blue);
    }

    .scan__corner--tl { top: 0; left: 0; border-width: 3px 0 0 3px; border-top-left-radius: 8px; }
    .scan__corner--tr { top: 0; right: 0; border-width: 3px 3px 0 0; border-top-right-radius: 8px; }
    .scan__corner--bl { bottom: 0; left: 0; border-width: 0 0 3px 3px; border-bottom-left-radius: 8px; }
    .scan__corner--br { right: 0; bottom: 0; border-width: 0 3px 3px 0; border-bottom-right-radius: 8px; }

    .quick {
      display: grid;
      gap: 10px;
      padding: 12px;
      border-radius: 14px;
      background: #fff;
      color: #0b1535;
    }

    .quick__who {
      display: grid;
      flex: 1;
      font-size: 14px;
    }

    .quick__label {
      font-size: 11px;
      color: #4b5a85;
    }
  `,
})
export class Pay {
  private readonly qr = inject(QrService);
  private readonly router = inject(Router);
  private readonly drafts = inject(PaymentDraftService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly samplePayload = SAMPLE_QR_PAYLOAD;
  protected readonly sampleQr = signal<string | null>(null);
  protected readonly found = signal<ResolvedQr | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.fb.group({ code: '' });

  constructor() {
    void this.qr.toDataUrl(SAMPLE_QR_PAYLOAD, 168).then((url) => this.sampleQr.set(url));
  }

  protected read(payload: string): void {
    this.error.set(null);
    this.found.set(null);
    try {
      this.found.set(this.qr.resolve(payload));
    } catch (e) {
      this.error.set(e instanceof QrError ? QR_MESSAGES[e.code] : 'No pudimos leer el código.');
    }
  }

  protected confirm(resolved: ResolvedQr): void {
    this.drafts.draft.set({ ...resolved, origin: '/billetera/pagar' });
    void this.router.navigateByUrl('/confirmar');
  }
}
