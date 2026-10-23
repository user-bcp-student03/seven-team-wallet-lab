import { Injectable, computed, signal } from '@angular/core';
import { Cents } from './money';

export type PaymentStatus = 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface UserRow {
  id: string;
  docType: 'DNI';
  docNumber: string;
  phone: string;
  email: string;
  salt: string;
  passwordHash: string;
  balanceCents: Cents;
  createdAt: string;
}

export interface PaymentRow {
  id: string;
  userId: string;
  kind: 'PAYMENT' | 'ITF';
  concept: string;
  contactId: string | null;
  reference: string | null;
  parentReference: string | null;
  amountCents: Cents;
  currency: 'PEN';
  status: PaymentStatus;
  idempotencyKey: string | null;
  createdAt: string;
}

export interface Db {
  users: readonly UserRow[];
  payments_history: readonly PaymentRow[];
}

const STORAGE_KEY = 'kipu_mock_db_v1';
const EMPTY: Db = { users: [], payments_history: [] };

/**
 * Base de datos simulada: tablas `users` y `payments_history` persistidas en
 * localStorage. Solo guarda hashes con sal (nunca la clave) ni tokens de sesion.
 */
@Injectable({ providedIn: 'root' })
export class DbService {
  private readonly state = signal<Db>(this.load());

  readonly users = computed(() => this.state().users);
  readonly paymentsHistory = computed(() => this.state().payments_history);

  /** Aplica todos los cambios juntos y persiste una sola vez. */
  transact(mutator: (db: Db) => Db): void {
    const next = mutator(this.state());
    this.state.set(next);
    this.persist(next);
  }

  reset(): void {
    this.state.set(EMPTY);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sin almacenamiento disponible: la base queda solo en memoria.
    }
  }

  private load(): Db {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<Db> | null;
      if (parsed && Array.isArray(parsed.users) && Array.isArray(parsed.payments_history)) {
        return { users: parsed.users, payments_history: parsed.payments_history };
      }
    } catch {
      // Datos corruptos o sin acceso al almacenamiento: se parte de una base vacia.
    }
    return EMPTY;
  }

  private persist(db: Db): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      // Cuota llena o almacenamiento bloqueado: se mantiene en memoria.
    }
  }
}
