import { normalizeJsonImport } from './normalizer';
import type { ImportResult } from '../domain/ImportResult';

/**
 * Import course data from a JSON object.
 * Validates and normalizes the input, returning an ImportResult.
 */
export function importJson(data: unknown): ImportResult {
  return normalizeJsonImport(data);
}
