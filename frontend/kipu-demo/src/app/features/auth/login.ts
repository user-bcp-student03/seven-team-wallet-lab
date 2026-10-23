import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthError, AuthService } from '../../core/auth.service';
import { DEMO_USER } from '../../core/mock-data';
import { KipuLogo } from '../../shared/kipu-logo';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, RouterLink, KipuLogo],
  template: `
    <div class="frame auth">
      <div class="brand">
        <app-kipu-logo [size]="96" />
        <h1 class="brand__name">KIPU</h1>
        <p class="muted">Paga y cobra con QR en segundos.</p>
      </div>

      <form class="stack" [formGroup]="form" (ngSubmit)="submit()" novalidate>
        @if (error()) {
          <p class="alert" role="alert">{{ error() }}</p>
        }

        <mat-form-field appearance="outline">
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="username" inputmode="email" />
          @if (form.controls.email.hasError('required')) {
            <mat-error>Ingresa tu correo.</mat-error>
          } @else if (form.controls.email.hasError('email')) {
            <mat-error>Escribe un correo válido, por ejemplo nombre&#64;correo.com.</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Clave</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="current-password" />
          @if (form.controls.password.hasError('required')) {
            <mat-error>Ingresa tu clave.</mat-error>
          }
        </mat-form-field>

        <button mat-flat-button class="wl-btn wl-btn--primary" type="submit" [disabled]="loading()">
          {{ loading() ? 'Ingresando…' : 'Ingresar' }}
        </button>
        <a mat-stroked-button class="wl-btn wl-btn--ghost" routerLink="/registro">Crear cuenta</a>
      </form>

      <section class="panel demo" aria-labelledby="demo-title">
        <h2 id="demo-title" class="demo__title">Entorno de demostración</h2>
        <p class="muted">Los datos son de prueba y se guardan solo en este navegador.</p>
        <div class="row">
          <button mat-stroked-button type="button" class="wl-btn wl-btn--ghost" (click)="fillDemo()">
            Usar cuenta de prueba
          </button>
          <button mat-button type="button" class="demo__reset" (click)="reset()">Restablecer</button>
        </div>
      </section>
    </div>
  `,
  styles: `
    .auth {
      justify-content: center;
      gap: 24px;
    }

    .brand {
      display: grid;
      justify-items: center;
      gap: 4px;
    }

    .brand__name {
      margin: 8px 0 0;
      font-size: 28px;
      letter-spacing: 0.18em;
    }

    .demo {
      display: grid;
      gap: 8px;
    }

    .demo__title {
      margin: 0;
      font-size: 14px;
    }

    .demo .wl-btn.mat-mdc-button-base {
      width: auto;
      flex: 1;
    }

    .demo__reset {
      color: var(--wl-muted);
    }
  `,
})
export class Login {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async submit(): Promise<void> {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    try {
      const { email, password } = this.form.getRawValue();
      await this.auth.login(email, password);
      await this.router.navigateByUrl('/billetera');
    } catch (e) {
      this.error.set(e instanceof AuthError ? e.message : 'No pudimos ingresar. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  protected fillDemo(): void {
    this.form.setValue({ email: DEMO_USER.email, password: DEMO_USER.password });
    this.error.set(null);
  }

  protected async reset(): Promise<void> {
    await this.auth.resetDemoData();
    this.form.reset();
    this.error.set(null);
  }
}
