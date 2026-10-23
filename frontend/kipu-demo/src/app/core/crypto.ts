export async function hashSecret(value: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Solo mock: contextos no seguros no exponen SubtleCrypto.
  let h = 5381;
  for (let i = 0; i < value.length; i++) h = (Math.imul(h, 33) ^ value.charCodeAt(i)) >>> 0;
  return `weak-${h.toString(16)}`;
}

export function randomId(prefix: string, bytes = 5): string {
  const buffer = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(buffer);
  return prefix + Array.from(buffer, (b) => b.toString(16).padStart(2, '0')).join('');
}
