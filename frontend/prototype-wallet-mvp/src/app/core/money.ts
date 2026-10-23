// Los importes se manejan como enteros en centimos para no usar float.
export type Cents = number;

const AMOUNT_PATTERN = /^(\d{1,6})(?:[.,](\d{1,2}))?$/;

export const MIN_PAYMENT: Cents = 100;
export const MAX_PAYMENT: Cents = 200000;
export const ITF_THRESHOLD: Cents = 100000;

export function parseAmount(text: string): Cents | null {
  const match = AMOUNT_PATTERN.exec(text.trim());
  if (!match) {
    return null;
  }
  const soles = Number.parseInt(match[1], 10);
  const fraction = Number.parseInt((match[2] ?? '').padEnd(2, '0') || '0', 10);
  return soles * 100 + fraction;
}

export function formatPen(cents: Cents): string {
  const soles = Math.trunc(cents / 100);
  const fraction = String(cents % 100).padStart(2, '0');
  return `S/ ${soles.toLocaleString('en-US')}.${fraction}`;
}

/** ITF 0.05% para montos >= S/ 1,000 (BUSSINESS_RULES.md). Redondeo al centimo mas cercano: supuesto pendiente de validar. */
export function calcItf(amount: Cents): Cents {
  return amount >= ITF_THRESHOLD ? Math.round((amount * 5) / 10000) : 0;
}

/** Devuelve el mensaje de validacion del monto, o null si es valido. */
export function validateAmount(amount: Cents, balance: Cents): string | null {
  if (amount < MIN_PAYMENT) {
    return `El monto mínimo es ${formatPen(MIN_PAYMENT)}`;
  }
  if (amount > MAX_PAYMENT) {
    return `El monto máximo es ${formatPen(MAX_PAYMENT)}`;
  }
  if (amount + calcItf(amount) > balance) {
    return 'Fondos insuficientes';
  }
  return null;
}
