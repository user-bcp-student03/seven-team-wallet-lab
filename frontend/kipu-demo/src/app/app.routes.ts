import { Routes } from '@angular/router';
import { authGuard, draftGuard, guestGuard } from './core/guards';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'billetera' },
  {
    path: 'login',
    title: 'Ingresar · KIPU',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · KIPU',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/onboarding/onboarding').then((m) => m.Onboarding),
  },
  {
    path: 'billetera',
    title: 'Billetera · KIPU',
    canActivate: [authGuard],
    loadComponent: () => import('./features/wallet/wallet-home').then((m) => m.WalletHome),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'pagar' },
      { path: 'pagar', loadComponent: () => import('./features/wallet/pay').then((m) => m.Pay) },
      { path: 'enviar', loadComponent: () => import('./features/wallet/send').then((m) => m.Send) },
      { path: 'cobrar', loadComponent: () => import('./features/wallet/receive').then((m) => m.Receive) },
    ],
  },
  {
    path: 'confirmar',
    title: 'Confirmar pago · KIPU',
    canActivate: [authGuard, draftGuard],
    loadComponent: () => import('./features/payments/confirm').then((m) => m.Confirm),
  },
  {
    path: 'resultado/:id',
    title: 'Resultado · KIPU',
    canActivate: [authGuard],
    loadComponent: () => import('./features/payments/result').then((m) => m.Result),
  },
  {
    path: 'movimientos',
    title: 'Movimientos · KIPU',
    canActivate: [authGuard],
    loadComponent: () => import('./features/history/history').then((m) => m.History),
  },
  { path: '**', redirectTo: '' },
];
