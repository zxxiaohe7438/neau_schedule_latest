import type { ImportResult } from '../domain/ImportResult';

/**
 * Import course data from HTML.
 * Placeholder implementation — requires cheerio for actual parsing.
 */
export function importHtml(_html: string): ImportResult {
  // TODO: implement with cheerio
  // Should parse HTML table structure and extract course data
  throw new Error('HTML importer not yet implemented — will be completed in Day 4');
}
