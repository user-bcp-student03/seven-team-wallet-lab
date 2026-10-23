import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { PaymentDraftService } from '../../core/payment-draft.service';
import { PaymentError, WalletService } from '../../core/wallet.service';
import { PenPipe } from '../../shared/pipes';
import { ScreenLayout } from '../../shared/screen-layout';

@Component({
  selector: 'app-confirm',
  imports: [MatButtonModule, MatProgressBarModule, PenPipe, ScreenLayout],
  template: `
    <app-screen heading="Pagar" [backLink]="origin()">
      @if (draft(); as d) {
        <p class="muted">Revisa antes de confirmar</p>

        <section class="panel recipient" aria-label="Destino del pago">
          <div class="row">
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <div class="recipient__who">
              <strong>{{ d.destination.name }}</strong>
              @if (d.destination.maskedPhone) {
                <span class="muted">Celular {{ d.destination.maskedPhone }}</span>
              }
            </div>
          </div>
          @if (d.destination.verified) {
            <span class="chip chip--dot">Destino verificado</span>
          }
          @if (d.destination.place) {
            <hr class="recipient__rule" />
            <span class="muted">{{ d.destination.place }}</span>
          }
        </section>

        <section class="amount" aria-label="Monto">
          <span class="muted">Monto</span>
          <strong class="amount__value">{{ d.amountCents | pen }}</strong>
          <span class="muted">Sin comisión · Llega al instante</span>
        </section>

        @if (processing()) {
          <div role="status" aria-live="polite">
            <mat-progress-bar mode="indeterminate" aria-label="Confirmando pago" />
            <p class="muted center">Confirmando tu pago… No cierres esta pantalla.</p>
          </div>
        }
        @if (error()) {
          <p class="alert" role="alert">{{ error() }}</p>
        }

        <div class="actions">
          <button mat-flat-button type="button" class="wl-btn wl-btn--primary" [disabled]="processing()" (click)="confirm()">
            {{ processing() ? 'Procesando…' : 'Confirmar pago' }}
          </button>
          <button mat-stroked-button type="button" class="wl-btn wl-btn--ghost" [disabled]="processing()" (click)="edit()">
            Editar
          </button>
        </div>
      }
    </app-screen>
  `,
  styles: `
    .recipient {
      display: grid;
      gap: 8px;
    }

    .recipient__who {
      display: grid;
      gap: 2px;
      font-size: 15px;
    }

    .recipient .chip {
      justify-self: start;
    }

    .recipient__rule {
      width: 100%;
      margin: 2px 0;
      border: 0;
      border-top: 1px solid var(--wl-border);
    }

    .amount {
      display: grid;
      gap: 2px;
    }

    .amount__value {
      font-size: 34px;
      line-height: 1.1;
      color: var(--wl-orange);
    }
  `,
})
export class Confirm {
  private readonly drafts = inject(PaymentDraftService);
  private readonly wallet = inject(WalletService);
  private readonly router = inject(Router);

  protected readonly draft = this.drafts.draft;
  protected readonly processing = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly origin = computed(() => this.draft()?.origin ?? '/billetera');
  protected readonly initials = computed(() =>
    (this.draft()?.destination.name ?? '')
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase(),
  );

  protected async confirm(): Promise<void> {
    const d = this.draft();
    if (!d || this.processing()) return;
    this.processing.set(true);
    this.error.set(null);
    try {
      const payment = await this.wallet.submit({
        destination: d.destination,
        amountCents: d.amountCents,
        chargeId: d.chargeId,
      });
      this.drafts.draft.set(null);
      await this.router.navigate(['/resultado', payment.id], { replaceUrl: true });
    } catch (e) {
      this.error.set(
        e instanceof PaymentError && e.code === 'AMOUNT_NOT_ALLOWED'
          ? 'El monto está fuera del rango permitido para pagos de bajo monto. Edítalo para continuar.'
          : 'No pudimos procesar el pago. No se hizo ningún cobro; inténtalo de nuevo.',
      );
    } finally {
      this.processing.set(false);
    }
  }

  protected edit(): void {
    void this.router.navigateByUrl(this.origin());
  }
}
