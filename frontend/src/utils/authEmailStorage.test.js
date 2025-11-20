import { beforeEach, describe, expect, it } from 'vitest';
import {
  setLastAuthEmail,
  getLastAuthEmail,
  clearLastAuthEmail,
} from './authEmailStorage';

describe('authEmailStorage helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('stores and retrieves the most recent email', () => {
    setLastAuthEmail('student@nyu.edu');
    expect(getLastAuthEmail()).toBe('student@nyu.edu');
  });

  it('returns an empty string when nothing has been stored', () => {
    expect(getLastAuthEmail()).toBe('');
  });

  it('clears any previously stored email', () => {
    setLastAuthEmail('seller@nyu.edu');
    clearLastAuthEmail();
    expect(getLastAuthEmail()).toBe('');
  });
});
