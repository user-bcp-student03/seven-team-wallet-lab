import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import {
  DOC_PATTERN,
  EMAIL_PATTERN,
  FieldKey,
  PASSWORD_PATTERN,
  PHONE_PATTERN,
  fieldError,
  sanitizeAlphanumeric,
  sanitizeDigits,
} from '../core/validators';

type Step = 1 | 2 | 3;

const STEPS: readonly { title: string; fields: readonly ('docNumber' | 'phone' | 'email' | 'password')[] }[] = [
  { title: 'Documento', fields: ['docNumber'] },
  { title: 'Contacto', fields: ['phone', 'email'] },
  { title: 'Seguridad', fields: ['password'] },
];

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div>
      <p class="eyebrow">Onboarding</p>
      <h2 class="title">Crea tu wallet</h2>
    </div>

    <div class="stepper" aria-hidden="true">
      @for (s of steps; track s.title; let i = $index) {
        <span class="seg" [class.on]="i < step()"></span>
      }
    </div>
    <p class="hint" aria-live="polite">
      Paso {{ step() }} de 3 · {{ current().title }}
      @if (nextTitle(); as next) {
        · Después: {{ next }}
      }
    </p>

    <form class="form" [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @switch (step()) {
        @case (1) {
          <div class="field">
            <label class="label" for="reg-doctype">Tipo de documento</label>
            <select id="reg-doctype" class="input" formControlName="docType">
              <option value="DNI">DNI</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="reg-doc">Número de documento</label>
            <input id="reg-doc" class="input" formControlName="docNumber" inputmode="numeric"
              [class.invalid]="error('docNumber')" (input)="clean('docNumber')" />
            <small class="muted">Solo números, máximo 8 dígitos.</small>
            @if (error('docNumber'); as message) {
              <small class="error-text" role="alert">{{ message }}</small>
            }
          </div>
        }
        @case (2) {
          <div class="field">
            <label class="label" for="reg-phone">Número de celular</label>
            <input id="reg-phone" class="input" formControlName="phone" inputmode="numeric"
              autocomplete="tel" [class.invalid]="error('phone')" (input)="clean('phone')" />
            <small class="muted">Solo números, máximo 9 dígitos.</small>
            @if (error('phone'); as message) {
              <small class="error-text" role="alert">{{ message }}</small>
            }
          </div>
          <div class="field">
            <label class="label" for="reg-email">Correo</label>
            <input id="reg-email" class="input" formControlName="email" type="email" autocomplete="email"
              [class.invalid]="error('email')" />
            <small class="muted">Letras y números, sin caracteres especiales.</small>
            @if (error('email'); as message) {
              <small class="error-text" role="alert">{{ message }}</small>
            }
          </div>
        }
        @case (3) {
          <div class="card">
            <small class="muted">Resumen</small>
            <div class="kv"><span>Documento</span><strong>DNI {{ form.controls.docNumber.value }}</strong></div>
            <div class="kv"><span>Celular</span><strong>{{ form.controls.phone.value }}</strong></div>
            <div class="kv"><span>Correo</span><strong>{{ form.controls.email.value }}</strong></div>
          </div>
          <div class="field">
            <label class="label" for="reg-pass">Contraseña</label>
            <div class="input-row">
              <input id="reg-pass" class="input" formControlName="password" autocomplete="new-password"
                [type]="showPassword() ? 'text' : 'password'" [class.invalid]="error('password')"
                (input)="clean('password')" />
              <button type="button" class="pill" (click)="showPassword.set(!showPassword())"
                [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                {{ showPassword() ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
            <small class="muted">Letras y números, máximo 20 caracteres.</small>
            @if (error('password'); as message) {
              <small class="error-text" role="alert">{{ message }}</small>
            }
          </div>
          @if (exists()) {
            <p class="banner error" role="alert">El cliente ya existe</p>
          }
        }
      }

      <div class="actions">
        <button class="btn primary" type="submit">{{ step() === 3 ? 'Registrar' : 'Siguiente' }}</button>
        @if (step() > 1) {
          <button class="btn outline" type="button" (click)="back()">Atrás</button>
        }
      </div>
    </form>

    <p class="foot">¿Ya tienes cuenta? <a routerLink="/login">Ingresar</a></p>
  `,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly steps = STEPS;
  protected readonly step = signal<Step>(1);
  protected readonly exists = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly current = computed(() => STEPS[this.step() - 1]);
  protected readonly nextTitle = computed(() => (this.step() < 3 ? STEPS[this.step()].title : null));

  protected readonly form = inject(FormBuilder).nonNullable.group({
    docType: ['DNI' as const],
    docNumber: ['', [Validators.required, Validators.pattern(DOC_PATTERN)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
    email: ['', [Validators.required, Validators.pattern(EMAIL_PATTERN)]],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
  });

  protected error(key: FieldKey): string | null {
    return fieldError(this.form.controls[key], key);
  }

  protected clean(key: 'docNumber' | 'phone' | 'password'): void {
    const control = this.form.controls[key];
    const clean =
      key === 'docNumber'
        ? sanitizeDigits(control.value, 8)
        : key === 'phone'
          ? sanitizeDigits(control.value, 9)
          : sanitizeAlphanumeric(control.value, 20);
    if (clean !== control.value) {
      control.setValue(clean);
    }
    this.exists.set(false);
  }

  protected back(): void {
    this.step.update((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  protected submit(): void {
    const fields = this.current().fields.map((f) => this.form.controls[f]);
    fields.forEach((c) => c.markAsTouched());
    if (fields.some((c) => c.invalid)) {
      return;
    }
    if (this.step() < 3) {
      this.step.update((s) => (s + 1) as Step);
      return;
    }

    const value = this.form.getRawValue();
    const result = this.auth.register(value);
    if (!result.ok) {
      this.exists.set(true);
      return;
    }
    this.toast.show('El cliente fue creado con éxito', 'ok');
    void this.router.navigateByUrl('/home');
  }
}
