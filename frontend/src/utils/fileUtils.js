/**
 * Format file size in bytes to human-readable string
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "2.5 MB", "500 KB")
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Validate image file size
 * @param {File} file - File object to validate
 * @param {number} maxSizeBytes - Maximum file size in bytes (default: 10MB)
 * @returns {Object} { valid: boolean, error: string | null }
 */
export function validateImageFile(file, maxSizeBytes = 10 * 1024 * 1024) {
  if (!file) {
    return { valid: false, error: "No file provided" };
  }
  
  if (file.size > maxSizeBytes) {
    const maxSizeMB = maxSizeBytes / (1024 * 1024);
    return {
      valid: false,
      error: `Image '${file.name}' is too large. Maximum size is ${maxSizeMB}MB per image.`,
    };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate multiple image files
 * @param {File[]} files - Array of File objects to validate
 * @param {number} maxSizePerFileBytes - Maximum size per file in bytes (default: 10MB)
 * @param {number} maxTotalSizeBytes - Maximum total size in bytes (default: 100MB)
 * @returns {Object} { valid: boolean, error: string | null }
 */
export function validateImageFiles(
  files,
  maxSizePerFileBytes = 10 * 1024 * 1024,
  maxTotalSizeBytes = 100 * 1024 * 1024
) {
  if (!files || files.length === 0) {
    return { valid: true, error: null };
  }
  
  // Check each file size
  for (const file of files) {
    const validation = validateImageFile(file, maxSizePerFileBytes);
    if (!validation.valid) {
      return validation;
    }
  }
  
  // Check total size
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > maxTotalSizeBytes) {
    const maxTotalMB = maxTotalSizeBytes / (1024 * 1024);
    return {
      valid: false,
      error: `Total size of all images (${formatFileSize(totalSize)}) exceeds the maximum of ${maxTotalMB}MB.`,
    };
  }
  
  return { valid: true, error: null };
}

