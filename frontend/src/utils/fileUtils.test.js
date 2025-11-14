import { describe, it, expect } from 'vitest';
import { formatFileSize, validateImageFile, validateImageFiles } from './fileUtils';

describe('fileUtils', () => {
  describe('formatFileSize', () => {
    it('formats 0 bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });

    it('formats bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('formats KB correctly', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(2048)).toBe('2 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
    });

    it('formats MB correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
      expect(formatFileSize(10 * 1024 * 1024)).toBe('10 MB');
    });

    it('formats GB correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('validateImageFile', () => {
    it('returns valid for file within size limit', () => {
      const file = { name: 'test.jpg', size: 5 * 1024 * 1024 }; // 5MB
      const result = validateImageFile(file);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid for file exceeding size limit', () => {
      const file = { name: 'large.jpg', size: 11 * 1024 * 1024 }; // 11MB
      const result = validateImageFile(file);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too large');
      expect(result.error).toContain('large.jpg');
      expect(result.error).toContain('10MB');
    });

    it('returns invalid for null file', () => {
      const result = validateImageFile(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('returns invalid for undefined file', () => {
      const result = validateImageFile(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('No file provided');
    });

    it('respects custom max size', () => {
      const file = { name: 'test.jpg', size: 6 * 1024 * 1024 }; // 6MB
      const result = validateImageFile(file, 5 * 1024 * 1024); // 5MB limit
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
    });

    it('accepts file at exact size limit', () => {
      const file = { name: 'test.jpg', size: 10 * 1024 * 1024 }; // Exactly 10MB
      const result = validateImageFile(file);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateImageFiles', () => {
    it('returns valid for empty array', () => {
      const result = validateImageFiles([]);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns valid for null/undefined', () => {
      expect(validateImageFiles(null).valid).toBe(true);
      expect(validateImageFiles(undefined).valid).toBe(true);
    });

    it('returns valid for files within limits', () => {
      const files = [
        { name: 'file1.jpg', size: 5 * 1024 * 1024 }, // 5MB
        { name: 'file2.jpg', size: 3 * 1024 * 1024 }, // 3MB
      ];
      const result = validateImageFiles(files);
      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('returns invalid if any file exceeds per-file limit', () => {
      const files = [
        { name: 'file1.jpg', size: 5 * 1024 * 1024 }, // 5MB
        { name: 'file2.jpg', size: 11 * 1024 * 1024 }, // 11MB - exceeds limit
      ];
      const result = validateImageFiles(files);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('file2.jpg');
      expect(result.error).toContain('too large');
    });

    it('returns invalid if total size exceeds limit', () => {
      // Use files that pass per-file validation (10MB each) but exceed total limit
      const files = Array(11).fill(null).map((_, i) => ({
        name: `file${i}.jpg`,
        size: 10 * 1024 * 1024, // 10MB each, total 110MB > 100MB limit
      }));
      const result = validateImageFiles(files);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Total size');
      expect(result.error).toContain('100MB');
    });

    it('returns valid when total size is within limit', () => {
      const files = Array(10).fill(null).map((_, i) => ({
        name: `file${i}.jpg`,
        size: 9 * 1024 * 1024, // 9MB each, total 90MB < 100MB limit
      }));
      const result = validateImageFiles(files);
      expect(result.valid).toBe(true);
    });

    it('respects custom max sizes', () => {
      const files = [
        { name: 'file1.jpg', size: 6 * 1024 * 1024 }, // 6MB
      ];
      const result = validateImageFiles(
        files,
        5 * 1024 * 1024, // 5MB per file
        50 * 1024 * 1024 // 50MB total
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('5MB');
    });
  });
});

