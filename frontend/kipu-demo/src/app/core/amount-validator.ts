import { ValidatorFn } from '@angular/forms';
import { MockRules, validateAmount } from './mock-rules';
import { parsePenToCents } from './money';

export const amountValidator =
  (rules: MockRules): ValidatorFn =>
  (control) => {
    const error = validateAmount(parsePenToCents(String(control.value ?? '')), rules);
    return error ? { amount: error } : null;
  };
