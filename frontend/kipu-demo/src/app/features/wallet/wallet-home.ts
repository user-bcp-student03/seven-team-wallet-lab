import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BalanceCard } from '../../shared/balance-card';
import { ScreenLayout } from '../../shared/screen-layout';

@Component({
  selector: 'app-wallet-home',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ScreenLayout, BalanceCard],
  template: `
    <app-screen heading="Billetera">
      <app-balance-card />
      <nav class="tabs" aria-label="Acción de la billetera">
        <a routerLink="pagar" routerLinkActive="tabs__link--active" ariaCurrentWhenActive="page" class="tabs__link">Pagar</a>
        <a routerLink="enviar" routerLinkActive="tabs__link--active" ariaCurrentWhenActive="page" class="tabs__link">Enviar</a>
        <a routerLink="cobrar" routerLinkActive="tabs__link--active" ariaCurrentWhenActive="page" class="tabs__link">Cobrar</a>
      </nav>
      <router-outlet />
    </app-screen>
  `,
  styles: `
    .tabs {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .tabs__link {
      padding: 8px 4px;
      border: 1px solid rgba(255, 255, 255, 0.55);
      border-radius: 999px;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
    }

    .tabs__link--active {
      border-color: #fff;
      background: #fff;
      color: #0b1535;
    }
  `,
})
export class WalletHome {}
