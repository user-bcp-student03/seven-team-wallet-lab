export function randomHex(bytes: number): string {
  // randomUUID solo existe en contextos seguros; getRandomValues tambien funciona por HTTP en la LAN.
  const values = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(values, (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function newReference(): string {
  const hex = randomHex(4);
  return `TX-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export function formatDate(date: Date): string {
  const month = date.toLocaleString('es-PE', { month: 'short' }).replace('.', '').toLowerCase();
  const time = date.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date.getDate()} ${month} ${date.getFullYear()} · ${time}`;
}
