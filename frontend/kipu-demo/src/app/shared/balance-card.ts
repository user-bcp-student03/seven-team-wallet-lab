import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { WalletService } from '../core/wallet.service';
import { PenPipe } from './pipes';

@Component({
  selector: 'app-balance-card',
  imports: [MatButtonModule, PenPipe],
  template: `
    <section class="panel balance" aria-label="Saldo disponible">
      <div class="balance__info">
        <span class="muted">Saldo disponible</span>
        <strong class="balance__value" aria-live="polite">
          @if (wallet.balanceVisible()) {
            {{ wallet.balanceCents() | pen }}
          } @else {
            <span class="sr-only">Saldo oculto</span>
            <span aria-hidden="true">S/ ••••</span>
          }
        </strong>
      </div>
      <button
        mat-stroked-button
        type="button"
        class="wl-btn wl-btn--ghost"
        [attr.aria-pressed]="wallet.balanceVisible()"
        (click)="wallet.balanceVisible.set(!wallet.balanceVisible())"
      >
        {{ wallet.balanceVisible() ? 'Ocultar saldo' : 'Ver saldo' }}
      </button>
    </section>
  `,
  styles: `
    .balance {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .balance__info {
      display: grid;
      gap: 2px;
    }

    .balance__value {
      font-size: 24px;
      line-height: 1.1;
    }

    .balance .wl-btn.mat-mdc-button-base {
      --mat-button-outlined-container-height: 36px;
      width: auto;
      font-size: 13px;
    }
  `,
})
export class BalanceCard {
  protected readonly wallet = inject(WalletService);
}
