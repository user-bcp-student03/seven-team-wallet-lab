import { inject, Injectable } from '@angular/core';
import QRCode from 'qrcode';
import { AuthService } from './auth.service';
import { randomId } from './crypto';
import { DbService } from './db.service';
import { CONTACTS, SAMPLE_QR_AMOUNT_CENTS, SAMPLE_QR_PAYLOAD } from './mock-data';
import { MOCK_RULES, validateAmount } from './mock-rules';
import { Party, QrChargeRecord } from './models';
import { chargeIsExpired } from './wallet.service';

const PAYLOAD_PREFIX = 'WALLET-MOCK:QR:';

export type QrErrorCode = 'INVALID' | 'NOT_FOUND' | 'ALREADY_PAID' | 'EXPIRED' | 'OWN_CHARGE';

export class QrError extends Error {
  constructor(readonly code: QrErrorCode) {
    super(code);
  }
}

export interface ResolvedQr {
  readonly destination: Party;
  readonly amountCents: number;
  readonly chargeId?: string;
}

/** Los códigos son del mock (no EMVCo) y solo se resuelven contra la base local. */
@Injectable({ providedIn: 'root' })
export class QrService {
  private readonly db = inject(DbService);
  private readonly auth = inject(AuthService);
  private readonly rules = inject(MOCK_RULES);

  createCharge(amountCents: number, concept: string): QrChargeRecord {
    const owner = this.auth.userId();
    if (!owner) throw new QrError('INVALID');
    if (validateAmount(amountCents, this.rules)) throw new QrError('INVALID');

    const id = randomId('qr-');
    const now = Date.now();
    const charge: QrChargeRecord = {
      id,
      reference: `QR-${id.slice(3, 9).toUpperCase()}`,
      ownerUserId: owner,
      amountCents,
      concept: concept.trim().slice(0, 60),
      payload: `${PAYLOAD_PREFIX}${id}`,
      status: 'ACTIVE',
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.rules.qrTtlMs).toISOString(),
    };
    this.db.update((draft) => void draft.charges.push(charge));
    return charge;
  }

  resolve(rawPayload: string): ResolvedQr {
    const payload = rawPayload.trim();
    if (!payload.startsWith(PAYLOAD_PREFIX)) throw new QrError('INVALID');

    if (payload === SAMPLE_QR_PAYLOAD) {
      return { destination: CONTACTS[0], amountCents: SAMPLE_QR_AMOUNT_CENTS };
    }

    const charge = this.db.state().charges.find((c) => c.payload === payload);
    if (!charge) throw new QrError('NOT_FOUND');
    if (charge.ownerUserId === this.auth.userId()) throw new QrError('OWN_CHARGE');
    if (charge.status === 'PAID') throw new QrError('ALREADY_PAID');
    if (chargeIsExpired(charge)) throw new QrError('EXPIRED');

    const owner = this.db.state().users.find((u) => u.id === charge.ownerUserId);
    return {
      destination: {
        id: `user:${charge.ownerUserId}`,
        name: owner?.fullName ?? 'Comercio',
        maskedPhone: owner ? `••• ••• ${owner.phone.slice(-3)}` : '',
        place: charge.concept || 'Cobro con QR',
        verified: true,
      },
      amountCents: charge.amountCents,
      chargeId: charge.id,
    };
  }

  toDataUrl(payload: string, width = 240): Promise<string> {
    return QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width,
      color: { dark: '#0b1535', light: '#ffffff' },
    });
  }
}
