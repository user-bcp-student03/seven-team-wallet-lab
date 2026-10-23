import { Party } from './models';

// Todos los datos son sintéticos; no representan personas ni comercios reales.
export interface MockContact extends Party {
  /** TIMEOUT: el primer intento expira sin cobro y el reintento se aprueba. */
  readonly scenario: 'OK' | 'TIMEOUT';
}

export const CONTACTS: readonly MockContact[] = [
  {
    id: 'c-carlos',
    name: 'Carlos Quispe',
    maskedPhone: '••• ••• 987',
    place: 'Bodega Don Carlos · Lima',
    verified: true,
    scenario: 'OK',
  },
  {
    id: 'c-ana',
    name: 'Ana Torres',
    maskedPhone: '••• ••• 312',
    place: 'Contacto personal',
    verified: true,
    scenario: 'OK',
  },
  {
    id: 'c-luis',
    name: 'Luis Ramos',
    maskedPhone: '••• ••• 455',
    place: 'Prueba: simula tiempo de espera',
    verified: true,
    scenario: 'TIMEOUT',
  },
];

export const SAMPLE_QR_PAYLOAD = 'WALLET-MOCK:QR:sample-bodega';
export const SAMPLE_QR_AMOUNT_CENTS = 2000;

export const DEMO_USER = {
  email: 'demo@wallet.test',
  password: 'Demo1234!',
  dni: '00000001',
  fullName: 'Mariana Demo',
  phone: '900000001',
  balanceCents: 15_000,
} as const;
