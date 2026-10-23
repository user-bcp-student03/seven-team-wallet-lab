import { computed, inject, Injectable, signal } from '@angular/core';
import { hashSecret, randomId } from './crypto';
import { DbService } from './db.service';
import { DEMO_USER } from './mock-data';
import { UserRecord } from './models';

const SESSION_KEY = 'wallet-mock-session';

/** Mensaje único: no revela si el correo existe o si falló la clave. */
export class AuthError extends Error {
  constructor() {
    super('Correo o clave incorrectos. Revisa tus datos e inténtalo de nuevo.');
  }
}

export class RegistrationError extends Error {
  constructor(readonly code: 'EMAIL_TAKEN' | 'DNI_TAKEN') {
    super(code);
  }
}

export interface RegistrationInput {
  readonly fullName: string;
  readonly dni: string;
  readonly email: string;
  readonly phone: string;
  readonly password: string;
}

const secretOf = (email: string, password: string) => hashSecret(`${email}:${password}`);

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly db = inject(DbService);
  private readonly sessionUserId = signal<string | null>(this.readSession());
  private ready = this.seedDemoUser();

  /** Cambia en cada inicio o cierre de sesión. */
  readonly sessionVersion = signal(0);

  readonly user = computed(() => this.db.state().users.find((u) => u.id === this.sessionUserId()) ?? null);
  readonly userId = computed(() => this.user()?.id ?? null);
  readonly isAuthenticated = computed(() => this.user() !== null);

  async login(email: string, password: string): Promise<void> {
    await this.ready;
    const normalized = email.trim().toLowerCase();
    const candidate = await secretOf(normalized, password);
    const user = this.db.state().users.find((u) => u.email === normalized);
    if (!user || user.secretHash !== candidate) throw new AuthError();
    this.startSession(user.id);
  }

  async register(input: RegistrationInput): Promise<UserRecord> {
    await this.ready;
    const email = input.email.trim().toLowerCase();
    const users = this.db.state().users;
    if (users.some((u) => u.email === email)) throw new RegistrationError('EMAIL_TAKEN');
    if (users.some((u) => u.dni === input.dni)) throw new RegistrationError('DNI_TAKEN');

    const user: UserRecord = {
      id: randomId('usr-'),
      email,
      dni: input.dni,
      fullName: input.fullName.trim(),
      phone: input.phone,
      secretHash: await secretOf(email, input.password),
      walletStatus: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    this.db.update((draft) => {
      draft.users.push(user);
      draft.balances[user.id] = 0;
    });
    this.startSession(user.id);
    return user;
  }

  logout(): void {
    this.sessionUserId.set(null);
    this.sessionVersion.update((v) => v + 1);
    globalThis.sessionStorage?.removeItem(SESSION_KEY);
  }

  async resetDemoData(): Promise<void> {
    this.logout();
    this.db.reset();
    this.ready = this.seedDemoUser();
    await this.ready;
  }

  private startSession(userId: string): void {
    this.sessionUserId.set(userId);
    this.sessionVersion.update((v) => v + 1);
    globalThis.sessionStorage?.setItem(SESSION_KEY, userId);
  }

  private readSession(): string | null {
    return globalThis.sessionStorage?.getItem(SESSION_KEY) ?? null;
  }

  private async seedDemoUser(): Promise<void> {
    if (this.db.state().users.some((u) => u.email === DEMO_USER.email)) return;
    const secretHash = await secretOf(DEMO_USER.email, DEMO_USER.password);
    const id = 'usr-demo';
    this.db.update((draft) => {
      draft.users.push({
        id,
        email: DEMO_USER.email,
        dni: DEMO_USER.dni,
        fullName: DEMO_USER.fullName,
        phone: DEMO_USER.phone,
        secretHash,
        walletStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
      });
      draft.balances[id] = DEMO_USER.balanceCents;
    });
  }
}
