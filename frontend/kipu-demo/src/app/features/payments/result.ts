import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { DbService } from '../../core/db.service';
import { formatDateTime, formatPen } from '../../core/money';
import { PaymentDraftService } from '../../core/payment-draft.service';
import { PaymentRecord } from '../../core/models';
import { DateTimeLabelPipe } from '../../shared/pipes';
import { ScreenLayout } from '../../shared/screen-layout';

const FAILURE_COPY = {
  PROVIDER_TIMEOUT: {
    subtitle: 'El tiempo de espera expiró',
    detail: 'Puedes reintentar con seguridad, no se duplicará el pago.',
  },
  INSUFFICIENT_FUNDS: {
    subtitle: 'Saldo insuficiente',
    detail: 'Tu saldo disponible no alcanza para este monto. Agrega saldo y vuelve a intentarlo.',
  },
  QR_NOT_AVAILABLE: {
    subtitle: 'El cobro ya no está disponible',
    detail: 'Pide al comercio un QR nuevo. No se hizo ningún cobro.',
  },
} as const;

@Component({
  selector: 'app-result',
  imports: [MatButtonModule, RouterLink, DateTimeLabelPipe, ScreenLayout],
  template: `
    <app-screen heading="Resultado">
      @if (payment(); as p) {
        @switch (p.status) {
          @case ('SUCCEEDED') {
            <div class="status" role="status">
              <svg class="status__icon" viewBox="0 0 96 96" aria-hidden="true">
                <circle cx="48" cy="48" r="46" fill="rgba(34,197,94,.18)" />
                <circle cx="48" cy="48" r="32" fill="#22c55e" />
                <path d="M34 49l10 10 19-21" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <h2 class="status__title">{{ isReceived() ? 'Cobro recibido' : 'Pago exitoso' }}</h2>
              <p class="status__text">{{ summary() }}</p>
            </div>

            <dl class="panel receipt">
              <dt class="muted">Referencia</dt>
              <dd class="receipt__ref">
                <strong>{{ p.reference }}</strong>
                <span class="chip">Guardado</span>
              </dd>
              <dt class="muted">Fecha y hora</dt>
              <dd><strong>{{ p.updatedAt | dateTimeLabel }}</strong></dd>
            </dl>

            <div class="actions">
              <button mat-flat-button type="button" class="wl-btn wl-btn--blue" (click)="share(p)">Compartir comprobante</button>
              <a mat-stroked-button class="wl-btn wl-btn--ghost" routerLink="/billetera">Volver al inicio</a>
            </div>
          }
          @case ('PENDING') {
            <div class="status" role="status">
              <svg class="status__icon" viewBox="0 0 96 96" aria-hidden="true">
                <circle cx="48" cy="48" r="46" fill="rgba(30,155,255,.18)" />
                <circle cx="48" cy="48" r="32" fill="#1e9bff" />
                <path d="M48 32v17l11 7" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
              <h2 class="status__title">Confirmando tu pago</h2>
              <p class="status__text">Estamos esperando la respuesta. No se cobrará dos veces.</p>
            </div>
            <div class="actions">
              <a mat-stroked-button class="wl-btn wl-btn--ghost" routerLink="/billetera">Volver</a>
            </div>
          }
          @default {
            <div class="status" role="status">
              <svg class="status__icon" viewBox="0 0 96 96" aria-hidden="true">
                <circle cx="48" cy="48" r="46" fill="rgba(255,122,0,.2)" />
                <circle cx="48" cy="48" r="32" fill="#ff7a00" />
                <path d="M48 31v20" stroke="#fff" stroke-width="7" stroke-linecap="round" />
                <circle cx="48" cy="64" r="4.5" fill="#fff" />
              </svg>
              <h2 class="status__title">Pago no realizado</h2>
              <p class="status__text">{{ failure().subtitle }}</p>
            </div>

            <section class="panel notice">
              <strong class="notice__title"><span class="notice__dot" aria-hidden="true"></span>No se hizo ningún cobro</strong>
              <p class="muted notice__text">{{ failure().detail }}</p>
            </section>

            <div class="actions">
              @if (p.reasonCode !== 'QR_NOT_AVAILABLE') {
                <button mat-flat-button type="button" class="wl-btn wl-btn--primary" (click)="retry(p)">Reintentar</button>
              }
              <a mat-stroked-button class="wl-btn wl-btn--ghost" routerLink="/billetera">Volver</a>
            </div>
          }
        }
      } @else {
        <section class="panel stack">
          <p class="alert" role="alert">No encontramos este pago en tu cuenta.</p>
          <a mat-stroked-button class="wl-btn wl-btn--ghost" routerLink="/movimientos">Ir a movimientos</a>
        </section>
      }
    </app-screen>
  `,
  styles: `
    .receipt {
      display: grid;
      gap: 2px;
      margin: 0;
      font-size: 13px;
    }

    .receipt dd {
      margin: 0 0 10px;
    }

    .receipt dd:last-child {
      margin-bottom: 0;
    }

    .receipt__ref {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .notice {
      display: grid;
      gap: 6px;
    }

    .notice__title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }

    .notice__dot {
      flex: none;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--wl-green);
    }

    .notice__text {
      margin: 0;
    }
  `,
})
export class Result {
  /** Parámetro de ruta `:id`. */
  readonly id = input.required<string>();

  private readonly db = inject(DbService);
  private readonly auth = inject(AuthService);
  private readonly drafts = inject(PaymentDraftService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly payment = computed(() => {
    const uid = this.auth.userId();
    const p = this.db.state().payments.find((x) => x.id === this.id());
    return p && (p.payerUserId === uid || p.payeeUserId === uid) ? p : undefined;
  });
  protected readonly isReceived = computed(() => this.payment()?.payerUserId !== this.auth.userId());
  protected readonly failure = computed(() => FAILURE_COPY[this.payment()?.reasonCode ?? 'PROVIDER_TIMEOUT']);
  protected readonly summary = computed(() => {
    const p = this.payment();
    if (!p) return '';
    return this.isReceived()
      ? `${formatPen(p.amountCents)} de ${p.payerName}`
      : `${formatPen(p.amountCents)} a ${p.destination.name}`;
  });

  protected retry(p: PaymentRecord): void {
    this.drafts.draft.set({
      destination: p.destination,
      amountCents: p.amountCents,
      chargeId: p.chargeId,
      origin: '/billetera',
    });
    void this.router.navigateByUrl('/confirmar');
  }

  protected async share(p: PaymentRecord): Promise<void> {
    const text = `Comprobante ${p.reference}: ${this.summary()} · ${formatDateTime(p.updatedAt)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Comprobante de pago', text });
      } else {
        await navigator.clipboard.writeText(text);
        this.snackBar.open('Comprobante copiado al portapapeles', 'Cerrar', { duration: 3000 });
      }
    } catch {
      // El usuario canceló el diálogo de compartir.
    }
  }
}
