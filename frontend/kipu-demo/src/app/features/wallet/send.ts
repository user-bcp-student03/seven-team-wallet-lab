import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { Router } from '@angular/router';
import { amountValidator } from '../../core/amount-validator';
import { CONTACTS } from '../../core/mock-data';
import { MOCK_RULES, validateAmount } from '../../core/mock-rules';
import { parsePenToCents } from '../../core/money';
import { PaymentDraftService } from '../../core/payment-draft.service';
import { WalletService } from '../../core/wallet.service';
import { PenPipe } from '../../shared/pipes';

@Component({
  selector: 'app-send',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatRadioModule, PenPipe],
  template: `
    <form class="stack" [formGroup]="form" (ngSubmit)="continue()" novalidate>
      <fieldset class="contacts">
        <legend class="muted">Elige a quién enviar</legend>
        <mat-radio-group formControlName="contactId" aria-label="Contacto destino" class="stack">
          @for (c of contacts; track c.id) {
            <mat-radio-button [value]="c.id" class="panel contact">
              <span class="contact__name">{{ c.name }}</span>
              <span class="muted">Celular {{ c.maskedPhone }} · {{ c.place }}</span>
            </mat-radio-button>
          }
        </mat-radio-group>
        @if (form.controls.contactId.touched && form.controls.contactId.invalid) {
          <p class="alert" role="alert">Elige un contacto para continuar.</p>
        }
      </fieldset>

      <mat-form-field appearance="outline">
        <mat-label>Monto en soles</mat-label>
        <input matInput formControlName="amount" inputmode="decimal" autocomplete="off" placeholder="20.00" />
        <span matTextPrefix>S/&nbsp;</span>
        <mat-hint>Saldo disponible: {{ wallet.balanceVisible() ? (wallet.balanceCents() | pen) : 'S/ ••••' }}</mat-hint>
        @switch (form.controls.amount.getError('amount')) {
          @case ('INVALID') { <mat-error>Ingresa un monto válido, por ejemplo 20.00.</mat-error> }
          @case ('TOO_LOW') { <mat-error>El monto mínimo es S/ 1.00.</mat-error> }
          @case ('TOO_HIGH') { <mat-error>Para pagos de bajo monto el máximo de prueba es S/ 500.00.</mat-error> }
        }
      </mat-form-field>

      <button mat-flat-button type="submit" class="wl-btn wl-btn--primary">Revisar envío</button>
    </form>
  `,
  styles: `
    .contacts {
      min-width: 0;
      margin: 0;
      padding: 0;
      border: 0;
    }

    .contacts legend {
      margin-bottom: 8px;
      padding: 0;
    }

    .contact {
      display: block;
      padding: 4px 8px;
    }

    .contact__name {
      display: block;
      font-weight: 600;
    }
  `,
})
export class Send {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly router = inject(Router);
  private readonly drafts = inject(PaymentDraftService);
  private readonly rules = inject(MOCK_RULES);
  protected readonly wallet = inject(WalletService);

  protected readonly contacts = CONTACTS;
  protected readonly form = this.fb.group({
    contactId: ['', Validators.required],
    amount: ['', [Validators.required, amountValidator(this.rules)]],
  });

  protected continue(): void {
    this.form.markAllAsTouched();
    const { contactId, amount } = this.form.getRawValue();
    const cents = parsePenToCents(amount);
    const contact = CONTACTS.find((c) => c.id === contactId);
    if (!contact || validateAmount(cents, this.rules)) return;

    this.drafts.draft.set({ destination: contact, amountCents: cents!, origin: '/billetera/enviar' });
    void this.router.navigateByUrl('/confirmar');
  }
}
