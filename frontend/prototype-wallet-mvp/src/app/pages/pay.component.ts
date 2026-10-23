import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Cents, ITF_THRESHOLD, MAX_PAYMENT, MIN_PAYMENT, calcItf, formatPen, parseAmount, validateAmount } from '../core/money';
import { CONTACTS, Contact, Outcome, PaymentService } from '../core/payment.service';
import { formatDate, randomHex } from '../core/util';

type Step = 'form' | 'review' | 'processing' | 'result';

@Component({
  selector: 'app-pay',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @switch (step()) {
      @case ('form') {
        <div class="page-head">
          <a class="back" routerLink="/home" aria-label="Volver al inicio">&#8249;</a>
          <div>
            <p class="eyebrow">Realizar pago</p>
            <h2 class="title">¿A quién pagas?</h2>
          </div>
        </div>

        <div class="contacts" role="radiogroup" aria-label="Contacto destino">
          @for (c of contacts; track c.id) {
            <button type="button" class="contact" role="radio" [class.selected]="contact()?.id === c.id"
              [attr.aria-checked]="contact()?.id === c.id" (click)="pick(c)">
              <span class="avatar">{{ c.initials }}</span>
              <span><strong>{{ c.name }}</strong><small class="muted">{{ c.phone }}</small></span>
            </button>
          }
        </div>

        <div class="field">
          <label class="label" for="pay-amount">Monto en soles (PEN)</label>
          <div class="amount-input-wrap">
            <span class="prefix">S/</span>
            <input id="pay-amount" class="input" inputmode="decimal" autocomplete="off" placeholder="0.00"
              [value]="amountText()" [class.invalid]="amountError()" (input)="onAmount($event)" />
          </div>
          <small class="muted">Mín. {{ min }} · Máx. {{ max }} · Saldo disponible {{ balanceLabel() }}</small>
          @if (amountError(); as message) {
            <small class="error-text" role="alert">{{ message }}</small>
          }
          @if (itfLabel(); as itf) {
            <small class="muted">{{ itf }}</small>
          }
        </div>

        <div class="actions">
          <button type="button" class="btn primary" (click)="goReview()">Continuar</button>
        </div>
      }

      @case ('review') {
        <div>
          <p class="eyebrow">Confirma tu pago</p>
          <h2 class="title">Revisa antes de confirmar</h2>
        </div>
        @if (contact(); as c) {
          <div class="card">
            <div class="who">
              <span class="avatar">{{ c.initials }}</span>
              <div><strong>{{ c.name }}</strong><small class="muted">{{ c.phone }}</small></div>
            </div>
            <span class="badge"><i class="dot"></i>Destino verificado</span>
            <small class="muted">{{ c.place }}</small>
          </div>
        }
        <div>
          <small class="muted">Monto a transferir</small>
          <strong class="amount">{{ amountLabel() }}</strong>
          <small class="muted">Moneda: soles (PEN)</small>
          @if (itfLabel(); as itf) {
            <small class="muted">{{ itf }}</small>
          }
        </div>
        <div class="actions">
          <button type="button" class="btn primary" (click)="confirm()">Confirmar pago</button>
          <button type="button" class="btn outline" (click)="step.set('form')">Editar</button>
        </div>
      }

      @case ('processing') {
        <div class="status" role="status" aria-live="polite">
          <span class="halo blue"><span class="spinner" aria-hidden="true"></span></span>
          <h2>Procesando pago…</h2>
          <p class="muted">No cierres esta pantalla</p>
        </div>
        <div class="card">
          <small class="muted">Transferencia</small>
          <strong>{{ amountLabel() }} a {{ contact()?.name }}</strong>
        </div>
      }

      @case ('result') {
        @if (outcome(); as o) {
          @switch (o.status) {
            @case ('SUCCESS') {
              <div class="status" role="status">
                <span class="halo green"><span class="icon">&#10003;</span></span>
                <h2>Pago exitoso</h2>
                <p class="muted">{{ amountLabel() }} a {{ o.payment.concept }}</p>
              </div>
              <div class="card">
                <div class="kv"><span>Referencia</span><strong>{{ o.payment.reference }}</strong></div>
                <div class="kv"><span>Fecha y hora</span><strong>{{ dateLabel(o) }}</strong></div>
                @if (o.itf) {
                  <div class="kv"><span>ITF (0.05%)</span><strong>{{ formatCents(o.itf.amountCents) }}</strong></div>
                }
                <div class="kv"><span>Saldo disponible</span><strong>{{ balanceLabel() }}</strong></div>
                @if (o.replayed) {
                  <small class="muted">Resultado original recuperado: no se cobró de nuevo.</small>
                }
              </div>
              <div class="actions">
                <a class="btn blue" routerLink="/movimientos">Ver mis movimientos</a>
                <a class="btn outline" routerLink="/home" (click)="reset()">Volver al inicio</a>
              </div>
            }
            @case ('FAILED') {
              <div class="status" role="alert">
                <span class="halo orange"><span class="icon">!</span></span>
                <h2>Pago fallido</h2>
                <p class="muted">{{ o.message ?? 'No se pudo completar la transferencia' }}</p>
              </div>
              <div class="card">
                <strong><i class="dot"></i>No se hizo ningún cobro</strong>
                <small class="muted">Quedó registrado como intento fallido. Puedes reintentar sin riesgo de duplicar el pago.</small>
              </div>
              <div class="actions">
                <button type="button" class="btn primary" (click)="confirm()">Reintentar</button>
                <a class="btn outline" routerLink="/home" (click)="reset()">Volver al inicio</a>
              </div>
            }
            @default {
              <div class="status" role="alert">
                <span class="halo orange"><span class="icon">!</span></span>
                <h2>Pago expirado</h2>
                <p class="muted">El tiempo de espera expiró</p>
              </div>
              <div class="card">
                <strong><i class="dot"></i>No se hizo ningún cobro</strong>
                <small class="muted">Quedó registrado como expirado. Puedes reintentar con seguridad, no se duplicará el pago.</small>
              </div>
              <div class="actions">
                <button type="button" class="btn primary" (click)="confirm()">Reintentar</button>
                <a class="btn outline" routerLink="/home" (click)="reset()">Volver al inicio</a>
              </div>
            }
          }
        }
      }
    }
  `,
})
export class PayComponent {
  private readonly auth = inject(AuthService);
  private readonly payments = inject(PaymentService);

  protected readonly contacts = CONTACTS;
  protected readonly min = formatPen(MIN_PAYMENT);
  protected readonly max = formatPen(MAX_PAYMENT);

  protected readonly step = signal<Step>('form');
  protected readonly contact = signal<Contact | null>(null);
  protected readonly amountText = signal('');
  protected readonly submitted = signal(false);
  protected readonly outcome = signal<Outcome | null>(null);

  private idempotencyKey: string | null = null;

  protected readonly balance = computed(() => this.auth.user()?.balanceCents ?? 0);
  protected readonly balanceLabel = computed(() => formatPen(this.balance()));
  protected readonly amountCents = computed<Cents | null>(() => parseAmount(this.amountText()));
  protected readonly amountLabel = computed(() => formatPen(this.amountCents() ?? 0));

  protected readonly amountError = computed(() => {
    const cents = this.amountCents();
    if (cents === null) {
      return this.submitted() ? 'Ingresa un monto válido (máximo 2 decimales)' : null;
    }
    return validateAmount(cents, this.balance());
  });

  protected readonly itfLabel = computed(() => {
    const cents = this.amountCents();
    if (cents === null || cents < ITF_THRESHOLD) {
      return null;
    }
    const itf = calcItf(cents);
    return `ITF 0.05%: ${formatPen(itf)} · Total a descontar ${formatPen(cents + itf)}`;
  });

  protected pick(contact: Contact): void {
    this.contact.set(contact);
    this.idempotencyKey = null;
  }

  protected onAmount(event: Event): void {
    const input = event.target as HTMLInputElement;
    const [integer = '', ...rest] = input.value.replace(',', '.').replace(/[^0-9.]/g, '').split('.');
    const clean = rest.length > 0 ? `${integer.slice(0, 6)}.${rest.join('').slice(0, 2)}` : integer.slice(0, 6);
    input.value = clean;
    this.amountText.set(clean);
    this.idempotencyKey = null;
  }

  protected goReview(): void {
    this.submitted.set(true);
    if (this.contact() && this.amountCents() !== null && !this.amountError()) {
      this.step.set('review');
    }
  }

  protected async confirm(): Promise<void> {
    const contact = this.contact();
    const amount = this.amountCents();
    if (this.step() === 'processing' || !contact || amount === null || this.amountError()) {
      return;
    }
    // La misma clave se reutiliza en los reintentos del mismo pago.
    const key = this.idempotencyKey ?? randomHex(16);
    this.idempotencyKey = key;
    this.step.set('processing');
    const outcome = await this.payments.submit(contact, amount, key);
    this.outcome.set(outcome);
    if (outcome.status === 'SUCCESS') {
      this.idempotencyKey = null;
    }
    this.step.set('result');
  }

  protected reset(): void {
    this.idempotencyKey = null;
  }

  protected dateLabel(outcome: Outcome): string {
    return formatDate(new Date(outcome.payment.createdAt));
  }

  protected formatCents(cents: Cents): string {
    return formatPen(cents);
  }
}
