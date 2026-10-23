import { AbstractControl } from '@angular/forms';

// Reglas del onboarding (BUSSINESS_RULES.md). Las longitudes minimas no estan definidas: no se inventan.
export const DOC_PATTERN = /^\d{1,8}$/;
export const PHONE_PATTERN = /^\d{1,9}$/;
export const EMAIL_PATTERN = /^[A-Za-z0-9]+@[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*\.[A-Za-z]{2,}$/;
export const PASSWORD_PATTERN = /^[A-Za-z0-9]{1,20}$/;

export type FieldKey = 'docNumber' | 'phone' | 'email' | 'password';

const MESSAGES: Record<FieldKey, string> = {
  docNumber: 'Solo números, máximo 8 dígitos',
  phone: 'Solo números, máximo 9 dígitos',
  email: 'Correo alfanumérico, sin caracteres especiales y con dominio válido (ej. usuario@dominio.com)',
  password: 'Solo letras y números, máximo 20 caracteres',
};

export function sanitizeDigits(value: string, max: number): string {
  return value.replace(/\D/g, '').slice(0, max);
}

export function sanitizeAlphanumeric(value: string, max: number): string {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, max);
}

export function fieldError(control: AbstractControl | null, key: FieldKey): string | null {
  if (!control || control.valid || !(control.touched || control.dirty)) {
    return null;
  }
  return control.hasError('required') ? 'Campo obligatorio' : MESSAGES[key];
}
