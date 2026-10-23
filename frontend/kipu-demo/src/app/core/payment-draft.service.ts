import { Injectable, signal } from '@angular/core';
import { PaymentRequest } from './models';

export interface PaymentDraft extends PaymentRequest {
  /** Ruta a la que vuelve "Editar". */
  readonly origin: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentDraftService {
  readonly draft = signal<PaymentDraft | null>(null);
}
