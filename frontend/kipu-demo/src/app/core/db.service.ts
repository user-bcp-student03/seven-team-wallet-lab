import { Injectable, signal } from '@angular/core';
import { DbState } from './models';

const STORAGE_KEY = 'wallet-mock-db-v1';

function emptyState(): DbState {
  return { version: 1, users: [], balances: {}, payments: [], charges: [], idempotency: [], events: [] };
}

/** Persistencia mock en el navegador; sustituye al backend y a PostgreSQL. */
@Injectable({ providedIn: 'root' })
export class DbService {
  readonly state = signal<DbState>(this.load());

  update(mutator: (draft: DbState) => void): void {
    const next = structuredClone(this.state());
    mutator(next);
    this.state.set(next);
    this.save(next);
  }

  reset(): void {
    const fresh = emptyState();
    this.state.set(fresh);
    this.save(fresh);
  }

  private load(): DbState {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as DbState) : null;
      if (parsed?.version === 1) return parsed;
    } catch {
      // Datos corruptos: se parte de un estado limpio.
    }
    return emptyState();
  }

  private save(state: DbState): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Sin almacenamiento disponible: el estado vive solo en memoria.
    }
  }
}
