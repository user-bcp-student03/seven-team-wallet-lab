import { inject, Injectable } from '@angular/core';
import { randomId } from './crypto';
import { DbService } from './db.service';

const MAX_EVENTS = 500;

/** Eventos con IDs opacos y sin PII (correo, DNI, nombres o teléfono). */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly db = inject(DbService);

  track(
    type: string,
    subjectRef: string,
    data?: Record<string, string | number>,
    correlationId = randomId('corr-'),
  ): void {
    this.db.update((draft) => {
      draft.events.push({ id: randomId('evt-'), type, at: new Date().toISOString(), correlationId, subjectRef, data });
      if (draft.events.length > MAX_EVENTS) draft.events.splice(0, draft.events.length - MAX_EVENTS);
    });
  }
}
