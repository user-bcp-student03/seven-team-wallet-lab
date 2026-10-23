import { Pipe, PipeTransform } from '@angular/core';
import { formatDateTime, formatPen } from '../core/money';

@Pipe({ name: 'pen' })
export class PenPipe implements PipeTransform {
  transform(cents: number): string {
    return formatPen(cents);
  }
}

@Pipe({ name: 'dateTimeLabel' })
export class DateTimeLabelPipe implements PipeTransform {
  transform(iso: string): string {
    return formatDateTime(iso);
  }
}
