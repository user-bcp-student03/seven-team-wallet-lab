import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ToastService } from './core/toast.service';
import { DevPanelComponent } from './shell/dev-panel.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DevPanelComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="layout">
      <header class="intro">
        <h1>Maqueta funcional · Onboarding, login y pagos</h1>
        <p>Prototipo con datos ficticios y base de datos simulada en el navegador. No es el producto.</p>
      </header>
      <div class="stage">
        <div class="phone">
          <div class="screen">
            <header class="top">
              <span class="logo"><img class="logo-img" src="kipu-icon.png" alt="" width="28" height="28" />KIPU</span>
              @if (auth.user()) {
                <button type="button" class="pill" (click)="logout()">Salir</button>
              }
            </header>
            @if (toast.message(); as t) {
              <div class="toast" [class.error]="t.kind === 'error'" role="status">{{ t.text }}</div>
            }
            <div class="content"><router-outlet /></div>
            <span class="home-bar"></span>
          </div>
        </div>
        <app-dev-panel />
      </div>
    </main>
  `,
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
