import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { formatPen } from '../core/money';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p class="eyebrow">Home del Wallet</p>
      <h2 class="title">Hola, bienvenido</h2>
      <p class="hint">DNI {{ maskedDoc() }}</p>
    </div>

    <div class="card">
      <small class="muted">Saldo disponible</small>
      <strong class="balance-amount">{{ balance() }}</strong>
      <small class="muted">Moneda: soles (PEN) · Dinero ficticio</small>
    </div>

    <div class="actions">
      <a class="btn primary" routerLink="/pagar">Pagar</a>
      <a class="btn outline" routerLink="/movimientos">Mis movimientos</a>
      <button class="btn outline" type="button" (click)="logout()">Cerrar sesión</button>
    </div>
  `,
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly balance = computed(() => formatPen(this.auth.user()?.balanceCents ?? 0));
  protected readonly maskedDoc = computed(() => {
    const doc = this.auth.user()?.docNumber ?? '';
    return `${'•'.repeat(Math.max(doc.length - 3, 0))}${doc.slice(-3)}`;
  });

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
