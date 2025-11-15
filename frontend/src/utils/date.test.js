import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { humanizePosted } from './date';

describe('humanizePosted branch coverage', () => {
  const fixed = new Date('2025-01-15T12:00:00Z');

  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(fixed);
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  const daysAgoISO = (n) => new Date(fixed.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  it('returns a non-empty string for today (0 days)', () => {
    const txt = humanizePosted(daysAgoISO(0));
    expect(typeof txt).toBe('string');
    expect(txt.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for yesterday (1 day)', () => {
    const txt = humanizePosted(daysAgoISO(1));
    expect(typeof txt).toBe('string');
    expect(txt.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for < 7 days (e.g., 3 days)', () => {
    const txt = humanizePosted(daysAgoISO(3));
    expect(typeof txt).toBe('string');
    expect(txt.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for < 30 days (e.g., 14 days)', () => {
    const txt = humanizePosted(daysAgoISO(14));
    expect(typeof txt).toBe('string');
    expect(txt.length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for >= 30 days (e.g., 40 days)', () => {
    const txt = humanizePosted(daysAgoISO(40));
    expect(typeof txt).toBe('string');
    expect(txt.length).toBeGreaterThan(0);
  });
});
