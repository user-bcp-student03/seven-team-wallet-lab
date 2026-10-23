import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DbService } from '../core/db.service';
import { formatPen } from '../core/money';
import { PaymentService, Scenario } from '../core/payment.service';
import { ToastService } from '../core/toast.service';

const SCENARIOS: readonly { value: Scenario; label: string; help: string }[] = [
  { value: 'success', label: 'Exitoso', help: 'El pago se confirma, actualiza el saldo y genera referencia.' },
  { value: 'failed', label: 'Fallido', help: 'No se cobra. Queda registrado como intento fallido.' },
  { value: 'expired', label: 'Expirado', help: 'Tiempo de espera agotado. No se cobra.' },
];

@Component({
  selector: 'app-dev-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .panel { width: 360px; padding: 20px; border: 1px solid var(--line); border-radius: 18px; background: rgba(255, 255, 255, 0.04); }
    h2 { margin-bottom: 4px; font-size: 18px; }
    h3 { margin: 18px 0 8px; font-size: 12px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.5px; }
    fieldset { margin: 0; padding: 0; border: 0; display: flex; flex-direction: column; gap: 6px; }
    legend { margin-bottom: 6px; font-size: 13px; font-weight: 600; }
    .option { display: flex; gap: 10px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 12px; cursor: pointer; }
    .option.selected { border-color: var(--orange); background: rgba(255, 122, 0, 0.12); }
    .option input { margin-top: 3px; accent-color: var(--orange); }
    .option strong { display: block; font-size: 13px; }
    .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0; }
    .stats div { padding: 8px 10px; border-radius: 10px; background: rgba(255, 255, 255, 0.05); }
    dt { font-size: 10.5px; color: var(--muted); }
    dd { margin: 2px 0 0; font-size: 15px; font-weight: 700; }
    .tools { display: flex; flex-direction: column; gap: 8px; }
    .tools .btn { padding: 9px 0; font-size: 12px; }
    details { margin-top: 12px; }
    summary { cursor: pointer; font-size: 12px; font-weight: 600; }
    pre { max-height: 180px; overflow: auto; margin: 8px 0 0; padding: 8px; border-radius: 10px; background: #050a1a; font-size: 10.5px; line-height: 1.4; }
    @media (max-width: 760px) { .panel { width: 100%; max-width: 360px; } }
  `,
  template: `
    <aside class="panel" aria-label="Simulador y base de datos">
      <h2>Simulador</h2>
      <p class="hint">Dinero ficticio. Sin backend: la base de datos vive en el localStorage de este navegador.</p>

      <h3>Resultado del próximo pago</h3>
      <fieldset>
        <legend class="sr">Resultado del próximo pago</legend>
        @for (s of scenarios; track s.value) {
          <label class="option" [class.selected]="payments.scenario() === s.value">
            <input type="radio" name="scenario" [value]="s.value" [checked]="payments.scenario() === s.value"
              (change)="payments.scenario.set(s.value)" />
            <span><strong>{{ s.label }}</strong><small class="muted">{{ s.help }}</small></span>
          </label>
        }
      </fieldset>

      <h3>Base de datos mock</h3>
      <dl class="stats">
        <div><dt>users</dt><dd>{{ db.users().length }}</dd></div>
        <div><dt>payments_history</dt><dd>{{ db.paymentsHistory().length }}</dd></div>
        <div><dt>Sesión</dt><dd>{{ auth.user() ? 'Activa' : 'Sin sesión' }}</dd></div>
        <div><dt>Saldo</dt><dd>{{ balance() }}</dd></div>
      </dl>

      <h3>Herramientas de demo</h3>
      <div class="tools">
        <button type="button" class="btn outline" [disabled]="!auth.user()" (click)="seed()">
          Generar historial de ejemplo (90 días)
        </button>
        <button type="button" class="btn outline" [disabled]="!auth.user()" (click)="topUp()">
          Recargar S/ 1,000.00 (demo)
        </button>
        <button type="button" class="btn outline" (click)="wipe()">Borrar base de datos</button>
      </div>

      <details>
        <summary>payments_history (últimos 5 registros)</summary>
        <pre>{{ preview() }}</pre>
      </details>
      <p class="hint" style="margin-top: 12px">
        Las contraseñas se guardan con SHA-256 + sal (solo para este mock; el producto usará Argon2id). La sesión
        vive en memoria: al recargar la página hay que ingresar de nuevo.
      </p>
    </aside>
  `,
})
export class DevPanelComponent {
  protected readonly db = inject(DbService);
  protected readonly auth = inject(AuthService);
  protected readonly payments = inject(PaymentService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected readonly scenarios = SCENARIOS;
  protected readonly balance = computed(() => (this.auth.user() ? formatPen(this.auth.user()!.balanceCents) : '—'));
  protected readonly preview = computed(() => {
    const rows = this.db.paymentsHistory().slice(-5).reverse();
    return rows.length ? JSON.stringify(rows, null, 2) : '[]';
  });

  protected seed(): void {
    const count = this.payments.seedHistory();
    this.toast.show(`Se agregaron ${count} registros de ejemplo (no afectan el saldo)`, 'ok');
  }

  protected topUp(): void {
    this.payments.topUp(100000);
    this.toast.show('Saldo recargado en S/ 1,000.00 (demo)', 'ok');
  }

  protected wipe(): void {
    this.db.reset();
    this.auth.logout();
    void this.router.navigateByUrl('/login');
    this.toast.show('Base de datos borrada', 'ok');
  }
}
