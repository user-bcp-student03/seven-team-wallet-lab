import { formatPen, parsePenToCents } from './money';

describe('money helpers', () => {
  it('parses soles into cents without floating point', () => {
    expect(parsePenToCents('20')).toBe(2000);
    expect(parsePenToCents('20.5')).toBe(2050);
    expect(parsePenToCents('0,07')).toBe(7);
    expect(parsePenToCents('19.99')).toBe(1999);
  });

  it('rejects invalid amounts', () => {
    for (const bad of ['', 'abc', '-5', '1.234', '1,2,3', '1e3']) {
      expect(parsePenToCents(bad)).toBeNull();
    }
  });

  it('formats cents as PEN', () => {
    expect(formatPen(2000)).toBe('S/ 20.00');
    expect(formatPen(5)).toBe('S/ 0.05');
  });
});
