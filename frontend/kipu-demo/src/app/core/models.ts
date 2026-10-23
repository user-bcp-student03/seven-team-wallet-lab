export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED';
export type ReasonCode = 'INSUFFICIENT_FUNDS' | 'PROVIDER_TIMEOUT' | 'QR_NOT_AVAILABLE';
export type ChargeStatus = 'ACTIVE' | 'PAID' | 'EXPIRED';

export interface Party {
  readonly id: string;
  readonly name: string;
  readonly maskedPhone: string;
  readonly place?: string;
  readonly verified: boolean;
}

export interface UserRecord {
  id: string;
  email: string;
  dni: string;
  fullName: string;
  phone: string;
  secretHash: string;
  walletStatus: 'ACTIVE';
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  reference: string;
  idempotencyKey: string;
  correlationId: string;
  attempt: number;
  payerUserId: string;
  payerName: string;
  payeeUserId?: string;
  destination: Party;
  amountCents: number;
  status: PaymentStatus;
  reasonCode?: ReasonCode;
  chargeId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QrChargeRecord {
  id: string;
  reference: string;
  ownerUserId: string;
  amountCents: number;
  concept: string;
  payload: string;
  status: ChargeStatus;
  paymentId?: string;
  createdAt: string;
  expiresAt: string;
}

export interface IdempotencyRecord {
  key: string;
  paymentId: string;
  duplicates: number;
  createdAt: string;
}

export interface AnalyticsEvent {
  id: string;
  type: string;
  at: string;
  correlationId: string;
  subjectRef: string;
  data?: Record<string, string | number>;
}

export interface DbState {
  version: 1;
  users: UserRecord[];
  balances: Record<string, number>;
  payments: PaymentRecord[];
  charges: QrChargeRecord[];
  idempotency: IdempotencyRecord[];
  events: AnalyticsEvent[];
}

export interface PaymentRequest {
  readonly destination: Party;
  readonly amountCents: number;
  readonly chargeId?: string;
}

export interface Movement {
  readonly id: string;
  readonly kind: 'SENT' | 'RECEIVED';
  readonly title: string;
  readonly reference: string;
  readonly amountCents: number;
  readonly status: PaymentStatus;
  readonly at: string;
  readonly link: readonly string[];
  readonly queryParams?: Record<string, string>;
}
