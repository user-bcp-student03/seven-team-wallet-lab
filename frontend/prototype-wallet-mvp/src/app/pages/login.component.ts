import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { DOC_PATTERN, PASSWORD_PATTERN, fieldError, sanitizeAlphanumeric, sanitizeDigits } from '../core/validators';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p class="eyebrow">Login</p>
      <h2 class="title">Ingresa a tu wallet</h2>
      <p class="hint">Usa el documento y la contraseña con los que te registraste.</p>
    </div>

    <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label class="label" for="login-doctype">Tipo de documento</label>
        <select id="login-doctype" class="input" formControlName="docType">
          <option value="DNI">DNI</option>
        </select>
      </div>

      <div class="field">
        <label class="label" for="login-doc">Número de documento</label>
        <input id="login-doc" class="input" formControlName="docNumber" inputmode="numeric"
          autocomplete="username" [class.invalid]="docError()" (input)="clean('docNumber', 8)" />
        @if (docError(); as message) {
          <small class="error-text" role="alert">{{ message }}</small>
        }
      </div>

      <div class="field">
        <label class="label" for="login-pass">Contraseña</label>
        <div class="input-row">
          <input id="login-pass" class="input" formControlName="password" autocomplete="current-password"
            [type]="showPassword() ? 'text' : 'password'" [class.invalid]="passError()" (input)="clean('password', 20)" />
          <button type="button" class="pill" (click)="showPassword.set(!showPassword())"
            [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
            {{ showPassword() ? 'Ocultar' : 'Ver' }}
          </button>
        </div>
        @if (passError(); as message) {
          <small class="error-text" role="alert">{{ message }}</small>
        }
      </div>

      @if (failed()) {
        <p class="banner error" role="alert">Datos incorrectos</p>
      }

      <div class="actions">
        <button class="btn primary" type="submit">Ingresar</button>
      </div>
    </form>

    <p class="foot">¿Aún no tienes cuenta? <a routerLink="/registro">Crear cuenta</a></p>
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly failed = signal(false);
  protected readonly showPassword = signal(false);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    docType: ['DNI' as const],
    docNumber: ['', [Validators.required, Validators.pattern(DOC_PATTERN)]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });

  protected docError(): string | null {
    return fieldError(this.form.controls.docNumber, 'docNumber');
  }

  protected passError(): string | null {
    return fieldError(this.form.controls.password, 'password');
  }

  protected clean(name: 'docNumber' | 'password', max: number): void {
    const control = this.form.controls[name];
    const clean = name === 'docNumber' ? sanitizeDigits(control.value, max) : sanitizeAlphanumeric(control.value, max);
    if (clean !== control.value) {
      control.setValue(clean);
    }
    this.failed.set(false);
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const { docType, docNumber, password } = this.form.getRawValue();
    if (this.auth.login(docType, docNumber, password)) {
      void this.router.navigateByUrl('/home');
    } else {
      this.failed.set(true);
    }
  }
}
