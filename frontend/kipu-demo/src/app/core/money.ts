/** Convierte texto en soles ("20", "20.5", "20,50") a céntimos sin usar coma flotante. */
export function parsePenToCents(raw: string): number | null {
  const match = /^(\d{1,6})(?:\.(\d{1,2}))?$/.exec(raw.trim().replace(',', '.'));
  if (!match) return null;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

export function formatPen(cents: number): string {
  const abs = Math.abs(cents);
  const soles = new Intl.NumberFormat('es-PE').format(Math.trunc(abs / 100));
  return `${cents < 0 ? '-' : ''}S/ ${soles}.${String(abs % 100).padStart(2, '0')}`;
}

export function formatDateTime(iso: string): string {
  const parts = new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('day')} ${get('month').replace('.', '')} ${get('year')} · ${get('hour')}:${get('minute')}`;
}
