import { Injectable, computed, inject, signal } from '@angular/core';
import { DbService, UserRow } from './db.service';
import { Cents } from './money';
import { sha256Hex } from './sha256';
import { randomHex } from './util';

export const INITIAL_BALANCE: Cents = 150000;

export interface RegisterInput {
  docType: 'DNI';
  docNumber: string;
  phone: string;
  email: string;
  password: string;
}

export type RegisterResult = { ok: true; user: UserRow } | { ok: false; code: 'EXISTS' };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly db = inject(DbService);
  // La sesion vive solo en memoria: no se guardan tokens en el navegador.
  private readonly sessionUserId = signal<string | null>(null);

  readonly user = computed(() => {
    const id = this.sessionUserId();
    return id ? (this.db.users().find((u) => u.id === id) ?? null) : null;
  });
  readonly isLoggedIn = computed(() => this.user() !== null);

  register(input: RegisterInput): RegisterResult {
    const exists = this.db.users().some((u) => u.docType === input.docType && u.docNumber === input.docNumber);
    if (exists) {
      return { ok: false, code: 'EXISTS' };
    }
    const salt = randomHex(8);
    const user: UserRow = {
      id: randomHex(8),
      docType: input.docType,
      docNumber: input.docNumber,
      phone: input.phone,
      email: input.email,
      salt,
      passwordHash: hashPassword(salt, input.password),
      balanceCents: INITIAL_BALANCE,
      createdAt: new Date().toISOString(),
    };
    this.db.transact((db) => ({ ...db, users: [...db.users, user] }));
    this.sessionUserId.set(user.id);
    return { ok: true, user };
  }

  login(docType: 'DNI', docNumber: string, password: string): boolean {
    const user = this.db.users().find((u) => u.docType === docType && u.docNumber === docNumber);
    if (!user || user.passwordHash !== hashPassword(user.salt, password)) {
      return false;
    }
    this.sessionUserId.set(user.id);
    return true;
  }

  logout(): void {
    this.sessionUserId.set(null);
  }
}

function hashPassword(salt: string, password: string): string {
  return sha256Hex(`${salt}:${password}`);
}
