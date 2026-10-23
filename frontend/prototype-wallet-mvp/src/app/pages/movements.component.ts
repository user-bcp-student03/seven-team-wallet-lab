import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PaymentRow } from '../core/db.service';
import { formatPen } from '../core/money';
import { HISTORY_DAYS, PaymentService } from '../core/payment.service';
import { formatDate } from '../core/util';

const PAGE_SIZE = 10;
const LOAD_DELAY_MS = 450;

@Component({
  selector: 'app-movements',
  imports: [RouterLink, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <a class="back" routerLink="/home" aria-label="Volver al inicio">&#8249;</a>
      <div>
        <p class="eyebrow">Mis movimientos</p>
        <h2 class="title">{{ extended() ? 'Últimos ' + days + ' días' : 'Últimas transacciones' }}</h2>
      </div>
    </div>

    @if (recent().length === 0) {
      <p class="empty">Aún no tienes movimientos. Realiza tu primer pago desde el Home.</p>
    } @else if (!extended()) {
      <p class="hint">Mostrando las últimas {{ recent().length }} transacciones.</p>
      <div class="scroll" role="list">
        @for (row of recent(); track row.id) {
          <ng-container *ngTemplateOutlet="rowTpl; context: { $implicit: row }" />
        }
      </div>
      @if (pool().length > recent().length) {
        <button type="button" class="btn outline" (click)="showMore()">Ver más movimientos</button>
      }
    } @else {
      <p class="hint" aria-live="polite">Mostrando {{ visible().length }} de {{ pool().length }} movimientos.</p>
      <div class="scroll" #scroller role="list">
        @for (row of visible(); track row.id) {
          <ng-container *ngTemplateOutlet="rowTpl; context: { $implicit: row }" />
        }
        <div class="sentinel" #sentinel>
          @if (loading()) {
            Cargando más movimientos…
          } @else if (!hasMore()) {
            No hay más movimientos en los últimos {{ days }} días.
          }
        </div>
      </div>
      <button type="button" class="btn outline" (click)="showLess()">Ver menos</button>
    }

    <ng-template #rowTpl let-row>
      <div class="row" role="listitem">
        <span class="avatar" [class.itf]="row.kind === 'ITF'">{{ initials(row) }}</span>
        <div class="row-main">
          <strong>{{ row.concept }}</strong>
          <small class="muted">{{ date(row) }}</small>
          <small class="muted">{{ detail(row) }}</small>
        </div>
        <div class="row-side">
          <span class="row-amount" [class.off]="row.status !== 'SUCCESS'">
            {{ row.status === 'SUCCESS' ? '−' : '' }}{{ money(row) }}
          </span>
          <span class="badge" [class.failed]="row.status === 'FAILED'" [class.expired]="row.status === 'EXPIRED'">
            {{ statusLabel(row) }}
          </span>
        </div>
      </div>
    </ng-template>
  `,
})
export class MovementsComponent {
  private readonly payments = inject(PaymentService);

  protected readonly days = HISTORY_DAYS;
  protected readonly recent = this.payments.recent;
  protected readonly extended = signal(false);
  protected readonly pool = signal<readonly PaymentRow[]>([]);
  protected readonly visibleCount = signal(PAGE_SIZE);
  protected readonly loading = signal(false);

  protected readonly visible = computed(() => this.pool().slice(0, this.visibleCount()));
  protected readonly hasMore = computed(() => this.visibleCount() < this.pool().length);

  private readonly scroller = viewChild<ElementRef<HTMLElement>>('scroller');
  private readonly sentinel = viewChild<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    this.pool.set(this.payments.last90Days());

    // Carga incremental: al llegar al final del scroll aparecen los 10 siguientes.
    effect((onCleanup) => {
      const root = this.scroller()?.nativeElement;
      const target = this.sentinel()?.nativeElement;
      this.visibleCount();
      if (!root || !target || typeof IntersectionObserver === 'undefined') {
        return;
      }
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            this.loadMore();
          }
        },
        { root, rootMargin: '60px' },
      );
      observer.observe(target);
      onCleanup(() => observer.disconnect());
    });
  }

  protected showMore(): void {
    this.pool.set(this.payments.last90Days());
    this.visibleCount.set(PAGE_SIZE);
    this.extended.set(true);
  }

  protected showLess(): void {
    this.extended.set(false);
    this.visibleCount.set(PAGE_SIZE);
  }

  private loadMore(): void {
    if (this.loading() || !this.hasMore()) {
      return;
    }
    this.loading.set(true);
    setTimeout(() => {
      this.visibleCount.update((n) => n + PAGE_SIZE);
      this.loading.set(false);
    }, LOAD_DELAY_MS);
  }

  protected initials(row: PaymentRow): string {
    return row.kind === 'ITF' ? 'ITF' : row.concept.split(' ').map((p) => p.charAt(0)).join('').slice(0, 2);
  }

  protected date(row: PaymentRow): string {
    return formatDate(new Date(row.createdAt));
  }

  protected detail(row: PaymentRow): string {
    if (row.kind === 'ITF') {
      return `Impuesto 0.05% · Ref. ${row.parentReference ?? '—'}`;
    }
    return row.reference ? `Ref. ${row.reference}` : 'Sin referencia';
  }

  protected money(row: PaymentRow): string {
    return formatPen(row.amountCents);
  }

  protected statusLabel(row: PaymentRow): string {
    return row.status === 'SUCCESS' ? 'Exitoso' : row.status === 'FAILED' ? 'Fallido' : 'Expirado';
  }
}
