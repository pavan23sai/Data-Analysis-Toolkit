/**
 * Export utility functions for Data Analysis Toolkit.
 * Provides file download capabilities for analysis results.
 */

/**
 * Creates a Blob from the given content and triggers a browser file download.
 *
 * @param filename - The name of the file to download (e.g., "report.csv")
 * @param content - The string content of the file
 * @param type - The MIME type of the file ('text/csv' or 'text/plain')
 */
export function downloadAsFile(
  filename: string,
  content: string,
  type: 'text/csv' | 'text/plain' = 'text/plain'
): void {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formats a number for export, returning 'N/A' for NaN/Infinity values.
 */
export function exportNumber(val: number, decimals = 4): string {
  if (Number.isNaN(val) || !Number.isFinite(val)) return 'N/A';
  return val.toFixed(decimals);
}
