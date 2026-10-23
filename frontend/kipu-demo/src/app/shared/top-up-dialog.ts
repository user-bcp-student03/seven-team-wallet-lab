import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MOCK_RULES } from '../core/mock-rules';
import { parsePenToCents } from '../core/money';
import { PenPipe } from './pipes';

const QUICK_AMOUNTS_CENTS = [5_000, 10_000, 20_000, 50_000] as const;

@Component({
  selector: 'app-top-up-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, PenPipe],
  template: `
    <h2 mat-dialog-title>Agregar saldo de prueba</h2>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      <mat-dialog-content>
        <mat-form-field appearance="outline">
          <mat-label>Monto en soles</mat-label>
          <input matInput formControlName="amount" inputmode="decimal" autocomplete="off" />
          <span matTextPrefix>S/&nbsp;</span>
          <mat-hint>Máximo {{ max | pen }}</mat-hint>
          @switch (form.controls.amount.getError('amount')) {
            @case ('INVALID') { <mat-error>Ingresa un monto válido, por ejemplo 100.00.</mat-error> }
            @case ('TOO_LOW') { <mat-error>El monto mínimo es S/ 1.00.</mat-error> }
            @case ('TOO_HIGH') { <mat-error>El máximo para saldo de prueba es {{ max | pen }}.</mat-error> }
          }
        </mat-form-field>
        <div class="quick" role="group" aria-label="Montos rápidos">
          @for (cents of quickAmounts; track cents) {
            <button mat-stroked-button type="button" (click)="pick(cents)">{{ cents | pen }}</button>
          }
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">Agregar</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .quick {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }
  `,
})
export class TopUpDialog {
  private readonly rules = inject(MOCK_RULES);
  private readonly ref = inject<MatDialogRef<TopUpDialog, number>>(MatDialogRef);

  protected readonly max = this.rules.demoTopUpMaxCents;
  protected readonly quickAmounts = QUICK_AMOUNTS_CENTS.filter((c) => c <= this.max);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    amount: [(this.rules.demoTopUpDefaultCents / 100).toFixed(2), [Validators.required, this.amountValidator()]],
  });

  protected pick(cents: number): void {
    this.form.controls.amount.setValue((cents / 100).toFixed(2));
  }

  protected submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.ref.close(parsePenToCents(this.form.getRawValue().amount)!);
  }

  private amountValidator(): ValidatorFn {
    return (control) => {
      const cents = parsePenToCents(String(control.value ?? ''));
      if (cents === null) return { amount: 'INVALID' };
      if (cents < this.rules.minAmountCents) return { amount: 'TOO_LOW' };
      if (cents > this.rules.demoTopUpMaxCents) return { amount: 'TOO_HIGH' };
      return null;
    };
  }
}
