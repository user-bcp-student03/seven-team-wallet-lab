import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { HomeComponent } from './pages/home.component';
import { LoginComponent } from './pages/login.component';
import { MovementsComponent } from './pages/movements.component';
import { PayComponent } from './pages/pay.component';
import { RegisterComponent } from './pages/register.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegisterComponent },
  { path: 'home', component: HomeComponent, canActivate: [authGuard] },
  { path: 'pagar', component: PayComponent, canActivate: [authGuard] },
  { path: 'movimientos', component: MovementsComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'login' },
];
