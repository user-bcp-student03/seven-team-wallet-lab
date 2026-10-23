import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../core/analytics.service';
import { AuthService, RegistrationError } from '../../core/auth.service';
import { randomId } from '../../core/crypto';
import { KipuLogo } from '../../shared/kipu-logo';

const STEPS = [
  { id: 'datos', label: 'Tus datos' },
  { id: 'contacto', label: 'Contacto' },
  { id: 'seguridad', label: 'Seguridad' },
] as const;

const samePassword = (group: AbstractControl): ValidationErrors | null =>
  group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-onboarding',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule, RouterLink, KipuLogo],
  template: `
    <div class="frame">
      <header class="head">
        <app-kipu-logo [size]="40" />
        <h1 class="head__title">Crea tu cuenta KIPU</h1>
        @if (!done()) {
          <a class="link" routerLink="/login">Ya tengo cuenta</a>
        }
      </header>

      <nav aria-label="Progreso del registro">
        <p class="muted" aria-live="polite">
          @if (done()) { Registro completo } @else { Paso {{ step() + 1 }} de {{ steps.length }} · {{ steps[step()].label }} }
        </p>
        <mat-progress-bar mode="determinate" [value]="progress()" aria-label="Avance del registro" />
        <ol class="steps">
          @for (s of steps; track s.id; let i = $index) {
            <li
              [class.steps__item--done]="done() || i < step()"
              [class.steps__item--current]="!done() && i === step()"
              [attr.aria-current]="!done() && i === step() ? 'step' : null"
            >
              {{ i + 1 }}. {{ s.label }}
            </li>
          }
        </ol>
      </nav>

      @if (done()) {
        <section class="stack center ready" role="status">
          <svg class="status__icon" viewBox="0 0 96 96" aria-hidden="true">
            <circle cx="48" cy="48" r="46" fill="rgba(34,197,94,.18)" />
            <circle cx="48" cy="48" r="32" fill="#22c55e" />
            <path d="M34 49l10 10 19-21" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          <h2 class="status__title">Tu cuenta KIPU está activa</h2>
          <p class="status__text">Ya puedes pagar, enviar y cobrar con QR.</p>
          <a mat-flat-button class="wl-btn wl-btn--primary" routerLink="/billetera/pagar">Empezar a pagar</a>
        </section>
      } @else {
        <form class="stack" [formGroup]="form" (ngSubmit)="next()" novalidate>
          @if (attempted() && currentGroup().invalid) {
            <p class="alert" role="alert">Revisa los campos marcados para continuar.</p>
          }
          @if (submitError()) {
            <p class="alert" role="alert">{{ submitError() }}</p>
          }

          @switch (step()) {
            @case (0) {
              <div formGroupName="datos" class="stack">
                <mat-form-field appearance="outline">
                  <mat-label>Nombres y apellidos</mat-label>
                  <input matInput formControlName="fullName" autocomplete="name" />
                  @if (invalid('datos.fullName')) {
                    <mat-error>Escribe tu nombre completo (solo letras, mínimo 3 caracteres).</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>DNI</mat-label>
                  <input matInput formControlName="dni" inputmode="numeric" maxlength="8" autocomplete="off" />
                  <mat-hint>8 dígitos</mat-hint>
                  @if (invalid('datos.dni')) {
                    <mat-error>El DNI debe tener exactamente 8 dígitos.</mat-error>
                  }
                </mat-form-field>
              </div>
            }
            @case (1) {
              <div formGroupName="contacto" class="stack">
                <mat-form-field appearance="outline">
                  <mat-label>Correo electrónico</mat-label>
                  <input matInput type="email" formControlName="email" autocomplete="email" inputmode="email" />
                  @if (form.get('contacto.email')?.hasError('taken')) {
                    <mat-error>Ya existe una cuenta con este correo. Ingresa con ella o usa otro.</mat-error>
                  } @else if (invalid('contacto.email')) {
                    <mat-error>Escribe un correo válido, por ejemplo nombre&#64;correo.com.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Celular</mat-label>
                  <input matInput formControlName="phone" inputmode="tel" maxlength="9" autocomplete="tel-national" />
                  <mat-hint>9 dígitos, empieza con 9</mat-hint>
                  @if (invalid('contacto.phone')) {
                    <mat-error>Ingresa un celular peruano de 9 dígitos que empiece con 9.</mat-error>
                  }
                </mat-form-field>
              </div>
            }
            @case (2) {
              <div formGroupName="seguridad" class="stack">
                <mat-form-field appearance="outline">
                  <mat-label>Crea una clave</mat-label>
                  <input matInput type="password" formControlName="password" autocomplete="new-password" />
                  <mat-hint>Mínimo 8 caracteres, con letras y números</mat-hint>
                  @if (invalid('seguridad.password')) {
                    <mat-error>Usa al menos 8 caracteres con letras y números.</mat-error>
                  }
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Repite la clave</mat-label>
                  <input matInput type="password" formControlName="confirm" autocomplete="new-password" />
                  @if (form.get('seguridad')?.hasError('mismatch') && form.get('seguridad.confirm')?.touched) {
                    <mat-error>Las claves no coinciden.</mat-error>
                  }
                </mat-form-field>
              </div>
            }
          }

          <div class="actions nav">
            <button mat-flat-button class="wl-btn wl-btn--primary" type="submit" [disabled]="loading()">
              {{ step() === steps.length - 1 ? (loading() ? 'Activando…' : 'Activar mi wallet') : 'Continuar' }}
            </button>
            @if (step() > 0) {
              <button mat-stroked-button class="wl-btn wl-btn--ghost" type="button" (click)="back()">Atrás</button>
            }
          </div>
        </form>
      }
    </div>
  `,
  styles: `
    .head {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .head__title {
      flex: 1;
      margin: 0;
      font-size: 20px;
    }

    .steps {
      display: flex;
      justify-content: space-between;
      margin: 8px 0 0;
      padding: 0;
      list-style: none;
      font-size: 11px;
      color: var(--wl-muted);
    }

    .steps__item--done {
      color: #4ade80;
    }

    .steps__item--current {
      color: #fff;
      font-weight: 700;
    }

    .ready {
      margin-top: 24px;
    }

    .nav {
      margin-top: 8px;
    }
  `,
})
export class Onboarding {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly router = inject(Router);
  private readonly flowId = randomId('onb-');
  private readonly correlationId = randomId('corr-');
  private readonly startedAt = Date.now();

  protected readonly steps = STEPS;
  protected readonly step = signal(0);
  protected readonly done = signal(false);
  protected readonly loading = signal(false);
  protected readonly attempted = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly progress = computed(() => (this.done() ? 100 : (this.step() / STEPS.length) * 100));

  protected readonly form = this.fb.group({
    datos: this.fb.group({
      fullName: ['', [Validators.required, Validators.pattern(/^[\p{L}][\p{L} .'-]{2,79}$/u)]],
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    }),
    contacto: this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^9\d{8}$/)]],
    }),
    seguridad: this.fb.group(
      {
        password: ['', [Validators.required, Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).{8,64}$/)]],
        confirm: ['', Validators.required],
      },
      { validators: samePassword },
    ),
  });

  constructor() {
    this.analytics.track('onboarding_started', this.flowId, undefined, this.correlationId);
  }

  protected currentGroup(): AbstractControl {
    return this.form.get(STEPS[this.step()].id)!;
  }

  protected invalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.touched || this.attempted());
  }

  protected back(): void {
    this.attempted.set(false);
    this.submitError.set(null);
    this.step.update((s) => Math.max(0, s - 1));
  }

  protected async next(): Promise<void> {
    const group = this.currentGroup();
    this.submitError.set(null);
    if (group.invalid) {
      this.attempted.set(true);
      group.markAllAsTouched();
      return;
    }
    this.attempted.set(false);
    this.analytics.track('onboarding_step_completed', this.flowId, { step: STEPS[this.step()].id }, this.correlationId);

    if (this.step() < STEPS.length - 1) {
      this.step.update((s) => s + 1);
      return;
    }
    await this.finish();
  }

  private async finish(): Promise<void> {
    const { datos, contacto, seguridad } = this.form.getRawValue();
    this.loading.set(true);
    try {
      await this.auth.register({
        fullName: datos.fullName,
        dni: datos.dni,
        email: contacto.email,
        phone: contacto.phone,
        password: seguridad.password,
      });
      this.analytics.track(
        'onboarding_completed',
        this.flowId,
        { durationMs: Date.now() - this.startedAt },
        this.correlationId,
      );
      this.done.set(true);
    } catch (e) {
      if (e instanceof RegistrationError && e.code === 'EMAIL_TAKEN') {
        this.form.get('contacto.email')?.setErrors({ taken: true });
        this.step.set(1);
        this.attempted.set(true);
      } else if (e instanceof RegistrationError) {
        this.form.get('datos.dni')?.setErrors({ taken: true });
        this.step.set(0);
        this.submitError.set('Ya existe una cuenta con este DNI. Si es tuya, ingresa desde la pantalla de inicio.');
      } else {
        this.submitError.set('No pudimos activar tu wallet. Inténtalo de nuevo.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
