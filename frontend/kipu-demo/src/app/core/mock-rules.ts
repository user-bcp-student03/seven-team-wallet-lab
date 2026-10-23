import { InjectionToken } from '@angular/core';

export interface MockRules {
  readonly minAmountCents: number;
  /** Valor de prueba: la regla de bajo monto por proveedor está pendiente de decisión de producto. */
  readonly lowValueLimitCents: number;
  /** Valor de prueba: la ventana de intento idempotente está pendiente de decisión. */
  readonly idempotencyWindowMs: number;
  readonly qrTtlMs: number;
  readonly processingDelayMs: number;
  /** Monto sugerido al agregar saldo de prueba (solo demo). */
  readonly demoTopUpDefaultCents: number;
  readonly demoTopUpMaxCents: number;
}

export const MOCK_RULES = new InjectionToken<MockRules>('MOCK_RULES', {
  providedIn: 'root',
  factory: () => ({
    minAmountCents: 100,
    lowValueLimitCents: 50_000,
    idempotencyWindowMs: 5 * 60_000,
    qrTtlMs: 5 * 60_000,
    processingDelayMs: 1500,
    demoTopUpDefaultCents: 10_000,
    demoTopUpMaxCents: 500_000,
  }),
});

export type AmountError = 'INVALID' | 'TOO_LOW' | 'TOO_HIGH';

export function validateAmount(cents: number | null, rules: MockRules): AmountError | null {
  if (cents === null) return 'INVALID';
  if (cents < rules.minAmountCents) return 'TOO_LOW';
  if (cents > rules.lowValueLimitCents) return 'TOO_HIGH';
  return null;
}
