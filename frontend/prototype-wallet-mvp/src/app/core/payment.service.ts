import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { DbService, PaymentRow, PaymentStatus } from './db.service';
import { Cents, calcItf } from './money';
import { newReference, randomHex } from './util';

export interface Contact {
  id: string;
  name: string;
  initials: string;
  phone: string;
  place: string;
}

export type Scenario = 'success' | 'failed' | 'expired';

export interface Outcome {
  status: PaymentStatus;
  payment: PaymentRow;
  itf: PaymentRow | null;
  replayed: boolean;
  message: string | null;
}

export const CONTACTS: readonly Contact[] = [
  { id: 'c1', name: 'Carlos Quispe', initials: 'CQ', phone: 'Celular ••• ••• 987', place: 'Bodega Don Carlos · Lima' },
  { id: 'c2', name: 'Lucía Rojas', initials: 'LR', phone: 'Celular ••• ••• 412', place: 'Contacto personal · Arequipa' },
  { id: 'c3', name: 'Mario Huamán', initials: 'MH', phone: 'Celular ••• ••• 275', place: 'Contacto personal · Cusco' },
];

export const RECENT_LIMIT = 10;
export const HISTORY_DAYS = 90;
const NETWORK_DELAY_MS = 1200;
const DAY_MS = 86_400_000;

/**
 * Pagos simulados. Cada intento produce un unico resultado terminal
 * (exitoso, fallido o expirado) y queda registrado en payments_history.
 */
@Injectable({ providedIn: 'root' })
export class PaymentService {
  private readonly db = inject(DbService);
  private readonly auth = inject(AuthService);

  readonly scenario = signal<Scenario>('success');

  private readonly userRows = computed(() => {
    const id = this.auth.user()?.id;
    const rows = id ? this.db.paymentsHistory().filter((r) => r.userId === id) : [];
    // reverse + sort estable: ante igual fecha, lo insertado despues aparece primero.
    return [...rows].reverse().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });

  readonly recent = computed(() => this.userRows().slice(0, RECENT_LIMIT));

  last90Days(): PaymentRow[] {
    const since = new Date(Date.now() - HISTORY_DAYS * DAY_MS).toISOString();
    return this.userRows().filter((r) => r.createdAt >= since);
  }

  async submit(contact: Contact, amount: Cents, key: string): Promise<Outcome> {
    const user = this.auth.user();
    if (!user) {
      throw new Error('Sesion requerida');
    }
    // El escenario simulado aplica a este intento; el siguiente vuelve a exitoso.
    const scenario = this.scenario();
    this.scenario.set('success');

    await new Promise((resolve) => setTimeout(resolve, NETWORK_DELAY_MS));

    const previous = this.db
      .paymentsHistory()
      .find((r) => r.userId === user.id && r.kind === 'PAYMENT' && r.idempotencyKey === key && r.status === 'SUCCESS');
    if (previous) {
      const itf = this.db.paymentsHistory().find((r) => r.kind === 'ITF' && r.parentReference === previous.reference) ?? null;
      return { status: 'SUCCESS', payment: previous, itf, replayed: true, message: null };
    }

    const fresh = this.db.users().find((u) => u.id === user.id) ?? user;
    const itfAmount = calcItf(amount);
    let status: PaymentStatus = scenario === 'success' ? 'SUCCESS' : scenario === 'failed' ? 'FAILED' : 'EXPIRED';
    let message: string | null = null;
    if (status === 'SUCCESS' && amount + itfAmount > fresh.balanceCents) {
      status = 'FAILED';
      message = 'Fondos insuficientes';
    }

    const now = new Date();
    const payment: PaymentRow = {
      id: randomHex(8),
      userId: user.id,
      kind: 'PAYMENT',
      concept: contact.name,
      contactId: contact.id,
      reference: status === 'SUCCESS' ? newReference() : null,
      parentReference: null,
      amountCents: amount,
      currency: 'PEN',
      status,
      idempotencyKey: key,
      createdAt: now.toISOString(),
    };
    const itf: PaymentRow | null =
      status === 'SUCCESS' && itfAmount > 0
        ? {
            ...payment,
            id: randomHex(8),
            kind: 'ITF',
            concept: 'ITF',
            contactId: null,
            reference: null,
            parentReference: payment.reference,
            amountCents: itfAmount,
            idempotencyKey: null,
            // Un milisegundo antes para que, ordenado por fecha, aparezca despues del pago.
            createdAt: new Date(now.getTime() - 1).toISOString(),
          }
        : null;

    // Debito y registros en el historial se aplican juntos.
    this.db.transact((db) => ({
      users:
        status === 'SUCCESS'
          ? db.users.map((u) => (u.id === user.id ? { ...u, balanceCents: u.balanceCents - amount - itfAmount } : u))
          : db.users,
      payments_history: [...db.payments_history, payment, ...(itf ? [itf] : [])],
    }));

    return { status, payment, itf, replayed: false, message };
  }

  /** Datos de ejemplo para probar "Ver mas movimientos": no modifica el saldo. */
  seedHistory(): number {
    const user = this.auth.user();
    if (!user) {
      return 0;
    }
    let seed = 7;
    const rnd = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const rows: PaymentRow[] = [];
    for (let i = 0; i < 45; i++) {
      // Los ultimos 5 quedan fuera de los 90 dias para comprobar el corte.
      const daysAgo = i < 40 ? Math.floor(rnd() * 89) : 95 + Math.floor(rnd() * 30);
      const at = new Date(Date.now() - daysAgo * DAY_MS - Math.floor(rnd() * DAY_MS));
      const contact = CONTACTS[Math.floor(rnd() * CONTACTS.length)];
      const amount: Cents = i === 3 ? 120000 : i === 17 ? 150000 : (Math.floor(rnd() * 90) + 5) * 100 + (i % 2) * 50;
      const status: PaymentStatus = i % 11 === 10 ? 'EXPIRED' : i % 7 === 6 ? 'FAILED' : 'SUCCESS';
      const reference = status === 'SUCCESS' ? newReference() : null;
      rows.push({
        id: randomHex(8),
        userId: user.id,
        kind: 'PAYMENT',
        concept: contact.name,
        contactId: contact.id,
        reference,
        parentReference: null,
        amountCents: amount,
        currency: 'PEN',
        status,
        idempotencyKey: randomHex(16),
        createdAt: at.toISOString(),
      });
      const itf = calcItf(amount);
      if (status === 'SUCCESS' && itf > 0) {
        rows.push({
          ...rows[rows.length - 1],
          id: randomHex(8),
          kind: 'ITF',
          concept: 'ITF',
          contactId: null,
          reference: null,
          parentReference: reference,
          amountCents: itf,
          idempotencyKey: null,
          createdAt: new Date(at.getTime() - 1).toISOString(),
        });
      }
    }
    this.db.transact((db) => ({ ...db, payments_history: [...db.payments_history, ...rows] }));
    return rows.length;
  }

  topUp(amount: Cents): void {
    const id = this.auth.user()?.id;
    if (id) {
      this.db.transact((db) => ({
        ...db,
        users: db.users.map((u) => (u.id === id ? { ...u, balanceCents: u.balanceCents + amount } : u)),
      }));
    }
  }
}
