/**
 * Slug normalization utility for Vietnamese text
 * Removes accents and converts special characters to dashes
 */

/**
 * Vietnamese character mappings for accent removal
 */
const VIETNAMESE_MAP: Record<string, string> = {
  // Lowercase vowels
  'à': 'a', 'á': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
  'ằ': 'a', 'ắ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
  'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
  'ă': 'a',
  'è': 'e', 'é': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
  'ê': 'e', 'ề': 'e', 'ế': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
  'ì': 'i', 'í': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
  'ò': 'o', 'ó': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
  'ô': 'o', 'ồ': 'o', 'ố': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
  'ơ': 'o', 'ờ': 'o', 'ớ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
  'ù': 'u', 'ú': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
  'ư': 'u', 'ừ': 'u', 'ứ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
  'ỳ': 'y', 'ý': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y',
  'đ': 'd',
  // Uppercase vowels
  'À': 'A', 'Á': 'A', 'Ả': 'A', 'Ã': 'A', 'Ạ': 'A',
  'Ằ': 'A', 'Ắ': 'A', 'Ẳ': 'A', 'Ẵ': 'A', 'Ặ': 'A',
  'Â': 'A', 'Ầ': 'A', 'Ấ': 'A', 'Ẩ': 'A', 'Ẫ': 'A', 'Ậ': 'A',
  'Ă': 'A',
  'È': 'E', 'É': 'E', 'Ẻ': 'E', 'Ẽ': 'E', 'Ẹ': 'E',
  'Ê': 'E', 'Ề': 'E', 'Ế': 'E', 'Ể': 'E', 'Ễ': 'E', 'Ệ': 'E',
  'Ì': 'I', 'Í': 'I', 'Ỉ': 'I', 'Ĩ': 'I', 'Ị': 'I',
  'Ò': 'O', 'Ó': 'O', 'Ỏ': 'O', 'Õ': 'O', 'Ọ': 'O',
  'Ô': 'O', 'Ồ': 'O', 'Ố': 'O', 'Ổ': 'O', 'Ỗ': 'O', 'Ộ': 'O',
  'Ơ': 'O', 'Ờ': 'O', 'Ớ': 'O', 'Ở': 'O', 'Ỡ': 'O', 'Ợ': 'O',
  'Ù': 'U', 'Ú': 'U', 'Ủ': 'U', 'Ũ': 'U', 'Ụ': 'U',
  'Ư': 'U', 'Ừ': 'U', 'Ứ': 'U', 'Ử': 'U', 'Ữ': 'U', 'Ự': 'U',
  'Ỳ': 'Y', 'Ý': 'Y', 'Ỷ': 'Y', 'Ỹ': 'Y', 'Ỵ': 'Y',
  'Đ': 'D',
};

/**
 * Normalizes a slug by removing accents and converting special characters to dashes
 * @param slug - The slug to normalize (undefined, null, or empty string returns empty string)
 * @returns The normalized slug, or empty string if input is falsy
 */
export function normalizeSlug(slug: string): string {
  if (!slug) return '';

  // Step 1: Remove Vietnamese accents using character mapping
  let normalized = slug.split('').map(char => VIETNAMESE_MAP[char] || char).join('');

  // Step 2: Convert to lowercase
  normalized = normalized.toLowerCase();

  // Step 3: Replace special characters (non-alphanumeric) with dashes
  normalized = normalized.replace(/[^a-z0-9]+/g, '-');

  // Step 4: Remove consecutive dashes
  normalized = normalized.replace(/-+/g, '-');

  // Step 5: Trim leading and trailing dashes
  normalized = normalized.replace(/^-+|-+$/g, '');

  return normalized;
}

/**
 * Creates a cache map for normalized slugs to avoid recomputation
 */
export function createSlugCache(): Map<string, string> {
  return new Map();
}

/**
 * Gets normalized slug with caching
 * @param slug - The slug to normalize (undefined, null, or empty string returns empty string)
 * @param cache - Optional cache map to store/retrieve normalized slugs
 * @returns The normalized slug, or empty string if input is falsy
 */
export function normalizeSlugCached(slug: string, cache?: Map<string, string>): string {
  if (!slug) return '';

  if (cache?.has(slug)) {
    return cache.get(slug)!;
  }

  const normalized = normalizeSlug(slug);
  cache?.set(slug, normalized);
  return normalized;
}
