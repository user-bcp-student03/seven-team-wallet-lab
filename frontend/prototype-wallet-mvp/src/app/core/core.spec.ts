import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { DbService } from './db.service';
import { calcItf, formatPen, parseAmount, validateAmount } from './money';
import { CONTACTS, PaymentService } from './payment.service';
import { sha256Hex } from './sha256';
import { DOC_PATTERN, EMAIL_PATTERN, PASSWORD_PATTERN, PHONE_PATTERN } from './validators';

describe('sha256Hex', () => {
  it('coincide con vectores conocidos', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });
});

describe('validadores de onboarding', () => {
  it('documento: solo digitos, maximo 8', () => {
    expect(DOC_PATTERN.test('12345678')).toBe(true);
    expect(DOC_PATTERN.test('123456789')).toBe(false);
    expect(DOC_PATTERN.test('1234abcd')).toBe(false);
  });

  it('celular: solo digitos, maximo 9', () => {
    expect(PHONE_PATTERN.test('987654321')).toBe(true);
    expect(PHONE_PATTERN.test('9876543210')).toBe(false);
    expect(PHONE_PATTERN.test('98765-432')).toBe(false);
  });

  it('correo: alfanumerico, sin especiales y con dominio valido', () => {
    expect(EMAIL_PATTERN.test('carlos2026@correo.com')).toBe(true);
    expect(EMAIL_PATTERN.test('carlos@mail.empresa.pe')).toBe(true);
    expect(EMAIL_PATTERN.test('car.los@correo.com')).toBe(false);
    expect(EMAIL_PATTERN.test('carlos+x@correo.com')).toBe(false);
    expect(EMAIL_PATTERN.test('carlos@correo')).toBe(false);
    expect(EMAIL_PATTERN.test('carlos@correo.c')).toBe(false);
  });

  it('contrasena: alfanumerica, maximo 20', () => {
    expect(PASSWORD_PATTERN.test('Clave2026')).toBe(true);
    expect(PASSWORD_PATTERN.test('a'.repeat(21))).toBe(false);
    expect(PASSWORD_PATTERN.test('Clave 2026')).toBe(false);
    expect(PASSWORD_PATTERN.test('Clave#2026')).toBe(false);
  });
});

describe('money', () => {
  it('parsea y formatea en centimos', () => {
    expect(parseAmount('20')).toBe(2000);
    expect(parseAmount('20.5')).toBe(2050);
    expect(parseAmount('1.234')).toBeNull();
    expect(formatPen(123456)).toBe('S/ 1,234.56');
  });

  it('valida minimo 1, maximo 2000 y fondos', () => {
    expect(validateAmount(99, 150000)).toContain('mínimo');
    expect(validateAmount(100, 150000)).toBeNull();
    expect(validateAmount(200001, 999999)).toContain('máximo');
    expect(validateAmount(200000, 999999)).toBeNull();
    expect(validateAmount(150001, 150000)).toBe('Fondos insuficientes');
  });

  it('ITF 0.05% solo desde S/ 1,000', () => {
    expect(calcItf(99999)).toBe(0);
    expect(calcItf(100000)).toBe(50);
    expect(calcItf(200000)).toBe(100);
    expect(validateAmount(150000, 150000)).toBe('Fondos insuficientes');
  });
});

describe('AuthService y PaymentService', () => {
  let auth: AuthService;
  let payments: PaymentService;
  let db: DbService;

  const input = { docType: 'DNI', docNumber: '12345678', phone: '987654321', email: 'ana@correo.com', password: 'Clave2026' } as const;

  async function pay(amount: number, key: string) {
    const pending = payments.submit(CONTACTS[0], amount, key);
    await vi.advanceTimersByTimeAsync(1500);
    return pending;
  }

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    TestBed.resetTestingModule();
    db = TestBed.inject(DbService);
    db.reset();
    auth = TestBed.inject(AuthService);
    payments = TestBed.inject(PaymentService);
  });

  afterEach(() => vi.useRealTimers());

  it('registra al cliente, no guarda la clave en claro y evita duplicados', () => {
    expect(auth.register(input).ok).toBe(true);
    const stored = JSON.stringify(db.users());
    expect(stored).not.toContain('Clave2026');
    expect(auth.register(input)).toEqual({ ok: false, code: 'EXISTS' });
    expect(db.users().length).toBe(1);
  });

  it('login correcto e incorrecto', () => {
    auth.register(input);
    auth.logout();
    expect(auth.login('DNI', '12345678', 'otra')).toBe(false);
    expect(auth.login('DNI', '00000000', 'Clave2026')).toBe(false);
    expect(auth.login('DNI', '12345678', 'Clave2026')).toBe(true);
    expect(auth.isLoggedIn()).toBe(true);
  });

  it('pago exitoso actualiza saldo y se registra en payments_history', async () => {
    auth.register(input);
    const outcome = await pay(2000, 'k1');
    expect(outcome.status).toBe('SUCCESS');
    expect(outcome.payment.reference).toMatch(/^TX-[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(auth.user()?.balanceCents).toBe(150000 - 2000);
    expect(db.paymentsHistory().length).toBe(1);
  });

  it('fallido y expirado no descuentan y quedan registrados sin referencia', async () => {
    auth.register(input);
    payments.scenario.set('failed');
    const failed = await pay(2000, 'k2');
    payments.scenario.set('expired');
    const expired = await pay(2000, 'k2');
    expect([failed.status, expired.status]).toEqual(['FAILED', 'EXPIRED']);
    expect(failed.payment.reference).toBeNull();
    expect(auth.user()?.balanceCents).toBe(150000);
    expect(db.paymentsHistory().length).toBe(2);
  });

  it('monto >= 1000 genera un movimiento ITF adicional', async () => {
    auth.register(input);
    payments.topUp(100000);
    const outcome = await pay(100000, 'k3');
    expect(outcome.itf?.concept).toBe('ITF');
    expect(outcome.itf?.amountCents).toBe(50);
    expect(auth.user()?.balanceCents).toBe(250000 - 100000 - 50);
    expect(payments.recent().map((r) => r.kind)).toEqual(['PAYMENT', 'ITF']);
  });

  it('reintentar con la misma clave no cobra dos veces', async () => {
    auth.register(input);
    const first = await pay(2000, 'k4');
    const second = await pay(2000, 'k4');
    expect(second.replayed).toBe(true);
    expect(second.payment.reference).toBe(first.payment.reference);
    expect(db.paymentsHistory().length).toBe(1);
    expect(auth.user()?.balanceCents).toBe(148000);
  });

  it('muestra las ultimas 10 y limita el historial a 90 dias', () => {
    auth.register(input);
    payments.seedHistory();
    expect(payments.recent().length).toBe(10);
    const last90 = payments.last90Days();
    expect(last90.length).toBeGreaterThan(10);
    const limit = Date.now() - 90 * 86_400_000;
    expect(last90.every((r) => Date.parse(r.createdAt) >= limit)).toBe(true);
    expect(db.paymentsHistory().length).toBeGreaterThan(last90.length);
  });
});
