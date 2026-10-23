import { Component, computed, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { amountValidator } from '../../core/amount-validator';
import { AuthService } from '../../core/auth.service';
import { DbService } from '../../core/db.service';
import { MOCK_RULES } from '../../core/mock-rules';
import { parsePenToCents } from '../../core/money';
import { QrService } from '../../core/qr.service';
import { chargeIsExpired, WalletService } from '../../core/wallet.service';
import { PenPipe } from '../../shared/pipes';

@Component({
  selector: 'app-receive',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, PenPipe, RouterLink],
  template: `
    @if (charge(); as c) {
      <section class="stack" aria-label="Cobro con QR">
        <div class="qr-card">
          @if (qrImage(); as src) {
            <img [src]="src" [alt]="'Código QR para cobrar ' + (c.amountCents / 100).toFixed(2) + ' soles'" />
          }
          <strong class="qr-card__amount">{{ c.amountCents | pen }}</strong>
          @if (c.concept) {
            <span class="muted qr-card__concept">{{ c.concept }}</span>
          }
        </div>

        <div class="panel info" aria-live="polite">
          <div class="info__row">
            <span class="muted">Referencia</span>
            <strong>{{ c.reference }}</strong>
          </div>
          <div class="info__row">
            <span class="muted">Estado</span>
            @switch (status()) {
              @case ('PAID') { <span class="chip">Pagado</span> }
              @case ('EXPIRED') { <span class="chip chip--bad">Expirado</span> }
              @default { <span class="chip chip--warn">Pendiente de pago</span> }
            }
          </div>
          @if (status() === 'ACTIVE') {
            <div class="info__row">
              <span class="muted">Vence en</span>
              <strong>{{ remaining() }}</strong>
            </div>
          }
        </div>

        @if (status() === 'PAID' && c.paymentId) {
          <p class="alert alert--ok" role="status">Cobro recibido. El saldo ya se actualizó.</p>
          <a mat-flat-button class="wl-btn wl-btn--blue" [routerLink]="['/resultado', c.paymentId]">Ver comprobante</a>
        } @else if (status() === 'EXPIRED') {
          <p class="alert" role="alert">Este QR expiró sin recibir pagos. Genera uno nuevo.</p>
        } @else {
          <button mat-stroked-button type="button" class="wl-btn wl-btn--ghost" (click)="copy(c.payload)">
            Copiar código del QR
          </button>
          <button mat-stroked-button type="button" class="wl-btn wl-btn--ghost" (click)="simulate(c.id)">
            Simular pago de un cliente (demo)
          </button>
        }
        <button mat-flat-button type="button" class="wl-btn wl-btn--primary" (click)="reset()">Nuevo cobro</button>
      </section>
    } @else {
      <form class="stack" [formGroup]="form" (ngSubmit)="create()" novalidate>
        <p class="muted">Indica el monto y comparte el QR para recibir el pago.</p>
        <mat-form-field appearance="outline">
          <mat-label>Monto a cobrar</mat-label>
          <input matInput formControlName="amount" inputmode="decimal" autocomplete="off" placeholder="20.00" />
          <span matTextPrefix>S/&nbsp;</span>
          @switch (form.controls.amount.getError('amount')) {
            @case ('INVALID') { <mat-error>Ingresa un monto válido, por ejemplo 20.00.</mat-error> }
            @case ('TOO_LOW') { <mat-error>El monto mínimo es S/ 1.00.</mat-error> }
            @case ('TOO_HIGH') { <mat-error>Para cobros de bajo monto el máximo de prueba es S/ 500.00.</mat-error> }
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Concepto (opcional)</mat-label>
          <input matInput formControlName="concept" maxlength="60" autocomplete="off" />
        </mat-form-field>
        <button mat-flat-button type="submit" class="wl-btn wl-btn--primary">Generar QR</button>
      </form>
    }
  `,
  styles: `
    .qr-card__amount {
      font-size: 20px;
    }

    .qr-card__concept {
      color: #4b5a85;
    }

    .info {
      display: grid;
      gap: 8px;
    }

    .info__row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
    }
  `,
})
export class Receive {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly db = inject(DbService);
  private readonly auth = inject(AuthService);
  private readonly qr = inject(QrService);
  private readonly wallet = inject(WalletService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly rules = inject(MOCK_RULES);

  /** Parámetro `?cargo=` enlazado desde Movimientos. */
  readonly cargo = input<string>();

  protected readonly form = this.fb.group({
    amount: ['', [Validators.required, amountValidator(this.rules)]],
    concept: '',
  });
  protected readonly chargeId = signal<string | null>(null);
  protected readonly qrImage = signal<string | null>(null);
  private readonly now = signal(Date.now());

  protected readonly charge = computed(() =>
    this.db
      .state()
      .charges.find((c) => c.id === this.chargeId() && c.ownerUserId === this.auth.userId()),
  );
  protected readonly status = computed(() => {
    const c = this.charge();
    if (!c) return null;
    if (c.paymentId) return 'PAID';
    return chargeIsExpired(c, this.now()) ? 'EXPIRED' : 'ACTIVE';
  });
  protected readonly remaining = computed(() => {
    const c = this.charge();
    const seconds = c ? Math.max(0, Math.ceil((Date.parse(c.expiresAt) - this.now()) / 1000)) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    effect(() => {
      const id = this.cargo();
      if (id) this.chargeId.set(id);
    });
    effect(() => {
      const payload = this.charge()?.payload;
      if (!payload) {
        this.qrImage.set(null);
        return;
      }
      void this.qr.toDataUrl(payload, 220).then((url) => this.qrImage.set(url));
    });
  }

  protected create(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { amount, concept } = this.form.getRawValue();
    const charge = this.qr.createCharge(parsePenToCents(amount)!, concept);
    this.chargeId.set(charge.id);
  }

  protected reset(): void {
    this.chargeId.set(null);
    this.form.reset({ amount: '', concept: '' });
  }

  protected async copy(payload: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(payload);
      this.snackBar.open('Código copiado. Pégalo en Pagar desde otra cuenta.', 'Cerrar', { duration: 3000 });
    } catch {
      this.snackBar.open('No pudimos copiar el código. Cópialo manualmente.', 'Cerrar', { duration: 3000 });
    }
  }

  protected async simulate(chargeId: string): Promise<void> {
    await this.wallet.receiveFromCustomer(chargeId);
  }
}
