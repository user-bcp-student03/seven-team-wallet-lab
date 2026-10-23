import { TestBed } from '@angular/core/testing';
import { AuthError, AuthService } from './auth.service';
import { DbService } from './db.service';
import { CONTACTS, DEMO_USER } from './mock-data';
import { MOCK_RULES, MockRules } from './mock-rules';
import { PaymentError, WalletService } from './wallet.service';
import { QrError, QrService } from './qr.service';

const RULES: MockRules = {
  minAmountCents: 100,
  lowValueLimitCents: 50_000,
  idempotencyWindowMs: 3_600_000,
  qrTtlMs: 3_600_000,
  processingDelayMs: 0,
  demoTopUpDefaultCents: 10_000,
  demoTopUpMaxCents: 500_000,
};

describe('wallet mock services', () => {
  let auth: AuthService;
  let wallet: WalletService;
  let qr: QrService;
  let db: DbService;

  beforeEach(async () => {
    globalThis.localStorage?.clear();
    globalThis.sessionStorage?.clear();
    TestBed.configureTestingModule({ providers: [{ provide: MOCK_RULES, useValue: RULES }] });
    auth = TestBed.inject(AuthService);
    wallet = TestBed.inject(WalletService);
    qr = TestBed.inject(QrService);
    db = TestBed.inject(DbService);
    await auth.login(DEMO_USER.email, DEMO_USER.password);
  });

  describe('login', () => {
    it('returns the same controlled error for unknown users and wrong passwords', async () => {
      auth.logout();
      const unknown = await auth.login('nadie@wallet.test', 'Cualquiera1').catch((e) => e);
      const wrong = await auth.login(DEMO_USER.email, 'Incorrecta1').catch((e) => e);
      expect(unknown).toBeInstanceOf(AuthError);
      expect(wrong).toBeInstanceOf(AuthError);
      expect(unknown.message).toBe(wrong.message);
      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('balance visibility', () => {
    it('starts hidden and hides again on a new session', async () => {
      TestBed.tick();
      expect(wallet.balanceVisible()).toBe(false);

      wallet.balanceVisible.set(true);
      auth.logout();
      await auth.login(DEMO_USER.email, DEMO_USER.password);
      TestBed.tick();
      expect(wallet.balanceVisible()).toBe(false);
    });
  });

  describe('demo top-up', () => {
    it('adds the chosen amount and rejects invalid or excessive ones', () => {
      expect(wallet.addDemoFunds(2_550)).toBe(true);
      expect(wallet.balanceCents()).toBe(DEMO_USER.balanceCents + 2_550);
      expect(wallet.addDemoFunds(0)).toBe(false);
      expect(wallet.addDemoFunds(12.5)).toBe(false);
      expect(wallet.addDemoFunds(RULES.demoTopUpMaxCents + 1)).toBe(false);
      expect(wallet.balanceCents()).toBe(DEMO_USER.balanceCents + 2_550);
    });
  });

  describe('payments', () => {
    const request = { destination: CONTACTS[0], amountCents: 2000 };

    it('debits once and stores a reference on success', async () => {
      const payment = await wallet.submit(request);
      expect(payment.status).toBe('SUCCEEDED');
      expect(payment.reference).toMatch(/^TX-[0-9A-F]{4}-[0-9A-F]{4}$/);
      expect(wallet.balanceCents()).toBe(DEMO_USER.balanceCents - 2000);
      expect(wallet.movements()[0].reference).toBe(payment.reference);
    });

    it('rejects insufficient balance without debit or success', async () => {
      const payment = await wallet.submit({ ...request, amountCents: 20_000 });
      expect(payment.status).toBe('FAILED');
      expect(payment.reasonCode).toBe('INSUFFICIENT_FUNDS');
      expect(wallet.balanceCents()).toBe(DEMO_USER.balanceCents);
    });

    it('rejects amounts outside the low-value range before processing', async () => {
      await expect(wallet.submit({ ...request, amountCents: 50_001 })).rejects.toBeInstanceOf(PaymentError);
      expect(db.state().payments).toHaveLength(0);
    });

    it('returns the original result for concurrent and repeated requests', async () => {
      const [a, b] = await Promise.all([wallet.submit(request), wallet.submit(request)]);
      const again = await wallet.submit(request);
      expect(b.id).toBe(a.id);
      expect(again.id).toBe(a.id);
      expect(db.state().payments).toHaveLength(1);
      expect(db.state().idempotency[0].duplicates).toBe(2);
      expect(wallet.balanceCents()).toBe(DEMO_USER.balanceCents - 2000);
    });

    it('expires without charging and then succeeds on retry without duplicating', async () => {
      const slow = { destination: CONTACTS[2], amountCents: 1500 };
      const first = await wallet.submit(slow);
      expect(first.status).toBe('EXPIRED');
      expect(wallet.balanceCents()).toBe(DEMO_USER.balanceCents);

      const retry = await wallet.submit(slow);
      expect(retry.status).toBe('SUCCEEDED');
      expect(retry.attempt).toBe(2);
      expect(wallet.balanceCents()).toBe(DEMO_USER.balanceCents - 1500);
    });

    it('keeps PII out of analytics events', async () => {
      await wallet.submit(request);
      const serialized = JSON.stringify(db.state().events);
      expect(serialized).not.toContain(DEMO_USER.email);
      expect(serialized).not.toContain(DEMO_USER.dni);
      expect(serialized).not.toContain(DEMO_USER.fullName);
    });
  });

  describe('QR charges', () => {
    it('lets another user pay a generated QR exactly once', async () => {
      const charge = qr.createCharge(2500, 'Almuerzo');
      expect(() => qr.resolve(charge.payload)).toThrowError(QrError);

      auth.logout();
      await auth.register({
        fullName: 'Pablo Pagador',
        dni: '11112222',
        email: 'pablo@wallet.test',
        phone: '911111111',
        password: 'Clave1234',
      });
      wallet.addDemoFunds(10_000);

      const resolved = qr.resolve(charge.payload);
      expect(resolved.amountCents).toBe(2500);
      const payment = await wallet.submit({
        destination: resolved.destination,
        amountCents: resolved.amountCents,
        chargeId: resolved.chargeId,
      });

      expect(payment.status).toBe('SUCCEEDED');
      expect(db.state().balances['usr-demo']).toBe(DEMO_USER.balanceCents + 2500);
      expect(db.state().charges[0].status).toBe('PAID');
      expect(() => qr.resolve(charge.payload)).toThrowError(QrError);
    });

    it('credits the owner once when the customer callback is simulated', async () => {
      const charge = qr.createCharge(3000, '');
      await wallet.receiveFromCustomer(charge.id);
      await wallet.receiveFromCustomer(charge.id);
      expect(wallet.balanceCents()).toBe(DEMO_USER.balanceCents + 3000);
      expect(db.state().payments).toHaveLength(1);
    });

    it('renders a scannable data URL', async () => {
      const url = await qr.toDataUrl('WALLET-MOCK:QR:test');
      expect(url.startsWith('data:image/png;base64,')).toBe(true);
    });
  });
});
