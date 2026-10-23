import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { PaymentDraftService } from './payment-draft.service';

export const authGuard: CanActivateFn = () =>
  inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/login']);

export const guestGuard: CanActivateFn = () =>
  !inject(AuthService).isAuthenticated() || inject(Router).createUrlTree(['/billetera']);

export const draftGuard: CanActivateFn = () =>
  inject(PaymentDraftService).draft() !== null || inject(Router).createUrlTree(['/billetera']);
