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

  it('does not store email when email is null', () => {
    setLastAuthEmail(null);
    expect(getLastAuthEmail()).toBe('');
  });

  it('does not store email when email is undefined', () => {
    setLastAuthEmail(undefined);
    expect(getLastAuthEmail()).toBe('');
  });

  it('does not store email when email is empty string', () => {
    setLastAuthEmail('');
    expect(getLastAuthEmail()).toBe('');
  });

  it('handles sessionStorage errors gracefully in setLastAuthEmail', () => {
    const originalSetItem = sessionStorage.setItem;
    
    // Mock setItem to throw an error
    sessionStorage.setItem = vi.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    // Should not throw, should catch and handle error gracefully
    expect(() => setLastAuthEmail('test@nyu.edu')).not.toThrow();
    
    sessionStorage.setItem = originalSetItem;
  });

  it('handles sessionStorage errors gracefully in getLastAuthEmail', () => {
    const originalGetItem = sessionStorage.getItem;
    
    // Mock getItem to throw an error
    sessionStorage.getItem = vi.fn(() => {
      throw new Error('Storage error');
    });

    const result = getLastAuthEmail();
    
    // Should return empty string on error
    expect(result).toBe('');
    
    sessionStorage.getItem = originalGetItem;
  });

  it('handles sessionStorage errors gracefully in clearLastAuthEmail', () => {
    const originalRemoveItem = sessionStorage.removeItem;
    
    // Mock removeItem to throw an error
    sessionStorage.removeItem = vi.fn(() => {
      throw new Error('Storage error');
    });

    // Should not throw, should catch and handle error gracefully
    expect(() => clearLastAuthEmail()).not.toThrow();
    
    sessionStorage.removeItem = originalRemoveItem;
  });
});
