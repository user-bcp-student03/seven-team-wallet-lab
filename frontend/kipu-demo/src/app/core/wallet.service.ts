import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { AnalyticsService } from './analytics.service';
import { AuthService } from './auth.service';
import { randomId } from './crypto';
import { DbService } from './db.service';
import { CONTACTS } from './mock-data';
import { MOCK_RULES, validateAmount } from './mock-rules';
import { Movement, PaymentRecord, PaymentRequest, QrChargeRecord } from './models';

export class PaymentError extends Error {
  constructor(readonly code: 'NOT_AUTHENTICATED' | 'AMOUNT_NOT_ALLOWED') {
    super(code);
  }
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function chargeIsExpired(charge: QrChargeRecord, now = Date.now()): boolean {
  return charge.status !== 'PAID' && now > Date.parse(charge.expiresAt);
}

/** Simula el backend de pagos: saldo atómico, idempotencia, estados terminales y callbacks. */
@Injectable({ providedIn: 'root' })
export class WalletService {
  private readonly db = inject(DbService);
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly rules = inject(MOCK_RULES);
  private readonly inflight = new Map<string, Promise<PaymentRecord>>();

  readonly balanceVisible = signal(false);
  readonly balanceCents = computed(() => {
    const uid = this.auth.userId();
    return uid ? (this.db.state().balances[uid] ?? 0) : 0;
  });

  readonly movements = computed<Movement[]>(() => {
    const uid = this.auth.userId();
    if (!uid) return [];
    const { payments, charges } = this.db.state();
    const now = Date.now();

    const fromPayments = payments
      .filter((p) => p.payerUserId === uid || p.payeeUserId === uid)
      .map<Movement>((p) => ({
        id: p.id,
        kind: p.payerUserId === uid ? 'SENT' : 'RECEIVED',
        title: p.payerUserId === uid ? p.destination.name : p.payerName,
        reference: p.reference,
        amountCents: p.amountCents,
        status: p.status,
        at: p.updatedAt,
        link: ['/resultado', p.id],
      }));

    const openCharges = charges
      .filter((c) => c.ownerUserId === uid && !c.paymentId)
      .map<Movement>((c) => ({
        id: c.id,
        kind: 'RECEIVED',
        title: c.concept || 'Cobro con QR',
        reference: c.reference,
        amountCents: c.amountCents,
        status: chargeIsExpired(c, now) ? 'EXPIRED' : 'PENDING',
        at: c.createdAt,
        link: ['/billetera/cobrar'],
        queryParams: { cargo: c.id },
      }));

    return [...fromPayments, ...openCharges].sort((a, b) => b.at.localeCompare(a.at));
  });

  constructor() {
    // El saldo arranca oculto en cada sesión nueva.
    effect(() => {
      this.auth.sessionVersion();
      untracked(() => this.balanceVisible.set(false));
    });

    // Un intento que quedó PENDING (p. ej. recarga de página) se resuelve; nunca se cobra de nuevo.
    for (const p of this.db.state().payments) {
      if (p.status === 'PENDING') this.inflight.set(p.id, this.process(p.id));
    }
  }

  payment(id: string): PaymentRecord | undefined {
    return this.db.state().payments.find((p) => p.id === id);
  }

  async submit(request: PaymentRequest): Promise<PaymentRecord> {
    const payerId = this.auth.userId();
    const payer = this.auth.user();
    if (!payerId || !payer) throw new PaymentError('NOT_AUTHENTICATED');
    if (validateAmount(request.amountCents, this.rules)) throw new PaymentError('AMOUNT_NOT_ALLOWED');

    const windowKey = [
      payerId,
      request.amountCents,
      request.destination.id,
      `w${Math.floor(Date.now() / this.rules.idempotencyWindowMs)}`,
    ].join('|');

    const record = this.db.state().idempotency.find((r) => r.key === windowKey);
    const latest = record ? this.payment(record.paymentId) : undefined;

    if (record && latest && (latest.status === 'PENDING' || latest.status === 'SUCCEEDED')) {
      this.db.update((draft) => {
        draft.idempotency.find((r) => r.key === windowKey)!.duplicates++;
      });
      this.analytics.track('payment_duplicate_blocked', payerId, { paymentId: latest.id }, latest.correlationId);
      return this.inflight.get(latest.id) ?? latest;
    }

    const now = new Date().toISOString();
    const attempt = (latest?.attempt ?? 0) + 1;
    const payment: PaymentRecord = {
      id: randomId('pay-'),
      reference: `TX-${randomId('', 2).toUpperCase()}-${randomId('', 2).toUpperCase()}`,
      idempotencyKey: attempt === 1 ? windowKey : `${windowKey}#a${attempt}`,
      correlationId: randomId('corr-'),
      attempt,
      payerUserId: payerId,
      payerName: payer.fullName,
      payeeUserId: request.destination.id.startsWith('user:') ? request.destination.id.slice(5) : undefined,
      destination: request.destination,
      amountCents: request.amountCents,
      status: 'PENDING',
      chargeId: request.chargeId,
      createdAt: now,
      updatedAt: now,
    };
    this.db.update((draft) => {
      draft.payments.push(payment);
      const existing = draft.idempotency.find((r) => r.key === windowKey);
      if (existing) existing.paymentId = payment.id;
      else draft.idempotency.push({ key: windowKey, paymentId: payment.id, duplicates: 0, createdAt: now });
    });
    this.analytics.track('payment_attempt_created', payerId, { paymentId: payment.id, attempt }, payment.correlationId);

    const task = this.process(payment.id);
    this.inflight.set(payment.id, task);
    return task;
  }

  /** Callback simulado del proveedor: un cliente de prueba paga un cobro QR propio. */
  async receiveFromCustomer(chargeId: string): Promise<PaymentRecord | undefined> {
    const charge = this.db.state().charges.find((c) => c.id === chargeId);
    if (!charge) return undefined;
    if (charge.paymentId) return this.payment(charge.paymentId);
    if (chargeIsExpired(charge)) return undefined;

    const now = new Date().toISOString();
    const payment: PaymentRecord = {
      id: randomId('pay-'),
      reference: charge.reference,
      idempotencyKey: `callback|${charge.id}`,
      correlationId: randomId('corr-'),
      attempt: 1,
      payerUserId: 'ext:cliente-demo',
      payerName: 'Cliente de prueba',
      payeeUserId: charge.ownerUserId,
      destination: { id: `user:${charge.ownerUserId}`, name: this.auth.user()?.fullName ?? '', maskedPhone: '', verified: true },
      amountCents: charge.amountCents,
      status: 'SUCCEEDED',
      chargeId: charge.id,
      createdAt: now,
      updatedAt: now,
    };
    this.db.update((draft) => {
      draft.payments.push(payment);
      draft.balances[charge.ownerUserId] = (draft.balances[charge.ownerUserId] ?? 0) + charge.amountCents;
      const target = draft.charges.find((c) => c.id === charge.id)!;
      target.status = 'PAID';
      target.paymentId = payment.id;
    });
    this.analytics.track('qr_charge_paid', charge.ownerUserId, { paymentId: payment.id }, payment.correlationId);
    return payment;
  }

  /** Devuelve false si el monto es inválido o supera el máximo de demo. */
  addDemoFunds(cents: number): boolean {
    const uid = this.auth.userId();
    if (!uid || !Number.isInteger(cents) || cents < this.rules.minAmountCents || cents > this.rules.demoTopUpMaxCents) {
      return false;
    }
    this.db.update((draft) => {
      draft.balances[uid] = (draft.balances[uid] ?? 0) + cents;
    });
    return true;
  }

  private async process(paymentId: string): Promise<PaymentRecord> {
    await delay(this.rules.processingDelayMs);

    // Validación de saldo, débito y cambio de estado en una sola mutación (atómica).
    this.db.update((draft) => {
      const p = draft.payments.find((x) => x.id === paymentId);
      if (!p || p.status !== 'PENDING') return;
      const contact = CONTACTS.find((c) => c.id === p.destination.id);
      const charge = p.chargeId ? draft.charges.find((c) => c.id === p.chargeId) : undefined;

      if (contact?.scenario === 'TIMEOUT' && p.attempt === 1) {
        p.status = 'EXPIRED';
        p.reasonCode = 'PROVIDER_TIMEOUT';
      } else if (charge && (charge.status === 'PAID' || chargeIsExpired(charge))) {
        p.status = 'FAILED';
        p.reasonCode = 'QR_NOT_AVAILABLE';
      } else if ((draft.balances[p.payerUserId] ?? 0) < p.amountCents) {
        p.status = 'FAILED';
        p.reasonCode = 'INSUFFICIENT_FUNDS';
      } else {
        draft.balances[p.payerUserId] -= p.amountCents;
        if (p.payeeUserId) draft.balances[p.payeeUserId] = (draft.balances[p.payeeUserId] ?? 0) + p.amountCents;
        if (charge) {
          charge.status = 'PAID';
          charge.paymentId = p.id;
        }
        p.status = 'SUCCEEDED';
      }
      p.updatedAt = new Date().toISOString();
    });

    this.inflight.delete(paymentId);
    const result = this.payment(paymentId)!;
    this.analytics.track(`payment_${result.status.toLowerCase()}`, result.payerUserId, { paymentId }, result.correlationId);
    return result;
  }
}
