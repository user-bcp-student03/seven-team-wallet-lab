import { Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { PaymentStatus } from '../../core/models';
import { WalletService } from '../../core/wallet.service';
import { DateTimeLabelPipe, PenPipe } from '../../shared/pipes';
import { ScreenLayout } from '../../shared/screen-layout';

const STATUS_LABEL: Record<PaymentStatus, { text: string; chip: string }> = {
  SUCCEEDED: { text: 'Exitoso', chip: 'chip' },
  PENDING: { text: 'Pendiente', chip: 'chip chip--info' },
  EXPIRED: { text: 'Expirado', chip: 'chip chip--warn' },
  FAILED: { text: 'Rechazado', chip: 'chip chip--bad' },
};

const localDay = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

@Component({
  selector: 'app-history',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink, DateTimeLabelPipe, PenPipe, ScreenLayout],
  template: `
    <app-screen heading="Movimientos" backLink="/billetera">
      <form class="filters" (submit)="$event.preventDefault()" aria-label="Filtrar movimientos">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Referencia</mat-label>
          <input matInput [value]="reference()" (input)="reference.set(value($event))" autocomplete="off" />
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Fecha</mat-label>
          <input matInput type="date" [value]="day()" (input)="day.set(value($event))" />
        </mat-form-field>
      </form>
      @if (reference() || day()) {
        <button mat-button type="button" class="clear" (click)="clear()">Quitar filtros</button>
      }

      @if (items().length) {
        <ul class="list" aria-live="polite">
          @for (m of items(); track m.id) {
            <li>
              <a class="panel move" [routerLink]="m.link" [queryParams]="m.queryParams">
                <span class="move__main">
                  <strong>{{ m.title }}</strong>
                  <span class="muted">{{ m.reference }} · {{ m.at | dateTimeLabel }}</span>
                </span>
                <span class="move__side">
                  <strong [class.move__in]="m.kind === 'RECEIVED'">
                    {{ m.kind === 'RECEIVED' ? '+' : '-' }}{{ m.amountCents | pen }}
                  </strong>
                  <span [class]="labels[m.status].chip">{{ labels[m.status].text }}</span>
                </span>
              </a>
            </li>
          }
        </ul>
      } @else {
        <p class="panel center muted">
          {{ reference() || day() ? 'No hay movimientos con estos filtros.' : 'Aún no tienes movimientos.' }}
        </p>
      }
    </app-screen>
  `,
  styles: `
    .filters {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .clear {
      align-self: flex-start;
      color: var(--wl-blue);
    }

    .list {
      display: grid;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .move {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      color: inherit;
      text-decoration: none;
    }

    .move__main,
    .move__side {
      display: grid;
      gap: 3px;
    }

    .move__side {
      justify-items: end;
    }

    .move__in {
      color: #4ade80;
    }
  `,
})
export class History {
  private readonly wallet = inject(WalletService);

  protected readonly labels = STATUS_LABEL;
  protected readonly reference = signal('');
  protected readonly day = signal('');
  protected readonly items = computed(() => {
    const ref = this.reference().trim().toLowerCase();
    const day = this.day();
    return this.wallet
      .movements()
      .filter((m) => (!ref || m.reference.toLowerCase().includes(ref)) && (!day || localDay(m.at) === day));
  });

  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  protected clear(): void {
    this.reference.set('');
    this.day.set('');
  }
}
