import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { formatPen } from '../core/money';
import { WalletService } from '../core/wallet.service';
import { KipuLogo } from './kipu-logo';
import { TopUpDialog } from './top-up-dialog';

@Component({
  selector: 'app-screen',
  imports: [MatButtonModule, MatMenuModule, RouterLink, KipuLogo],
  template: `
    <div class="frame">
      <header class="bar">
        @if (backLink(); as link) {
          <a class="bar__back" [routerLink]="link" aria-label="Volver"><span aria-hidden="true">‹</span></a>
        } @else {
          <app-kipu-logo [size]="34" />
        }
        <h1 class="bar__title">{{ heading() }}</h1>
        <button type="button" class="avatar bar__account" [matMenuTriggerFor]="menu" aria-label="Menú de la cuenta">
          {{ initials() }}
        </button>
        <mat-menu #menu="matMenu">
          <a mat-menu-item routerLink="/billetera">Billetera</a>
          <a mat-menu-item routerLink="/movimientos">Movimientos</a>
          <button mat-menu-item type="button" (click)="addFunds()">Agregar saldo de prueba</button>
          <button mat-menu-item type="button" (click)="logout()">Cerrar sesión</button>
        </mat-menu>
      </header>
      <main class="content">
        <ng-content />
      </main>
    </div>
  `,
  styles: `
    .bar {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .bar__title {
      flex: 1;
      margin: 0;
      font-size: 18px;
    }

    .bar__back {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      color: #fff;
      font-size: 26px;
      line-height: 1;
      text-decoration: none;
    }

    .bar__account {
      border: 0;
      cursor: pointer;
    }
  `,
})
export class ScreenLayout {
  readonly heading = input.required<string>();
  readonly backLink = input<string | null>(null);

  protected readonly wallet = inject(WalletService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);

  protected readonly initials = computed(() =>
    (this.auth.user()?.fullName ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

  protected async addFunds(): Promise<void> {
    const ref = this.dialog.open<TopUpDialog, void, number>(TopUpDialog, { width: 'min(92vw, 360px)' });
    const cents = await firstValueFrom(ref.afterClosed());
    if (cents && this.wallet.addDemoFunds(cents)) {
      this.snackBar.open(`Saldo de prueba agregado: ${formatPen(cents)}`, 'Cerrar', { duration: 3000 });
    }
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
