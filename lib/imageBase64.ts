/**
 * Helpers for validating and storing images as base64 data URLs.
 * Max size default 2MB (base64 string length) to keep documents reasonable.
 */

const DATA_URL_PREFIX = 'data:';
const BASE64_PREFIX = 'data:image/';
const ALLOWED_MIMES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export interface Base64ImageResult {
  valid: boolean;
  error?: string;
  dataUrl?: string;
  mime?: string;
}

/**
 * Validate a base64 image data URL and optional size limit.
 * Returns validated dataUrl (can be stored as-is in DB) or error.
 */
export function validateBase64Image(
  input: string,
  maxBytes: number = 2 * 1024 * 1024
): Base64ImageResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Image data is required' };
  }

  const dataUrl = input.trim();
  if (!dataUrl.startsWith(DATA_URL_PREFIX)) {
    return { valid: false, error: 'Invalid format. Use a data URL (data:image/...;base64,...)' };
  }

  if (!dataUrl.startsWith(BASE64_PREFIX)) {
    return { valid: false, error: 'Only image types are allowed (jpeg, png, gif, webp)' };
  }

  const semicolon = dataUrl.indexOf(';');
  const comma = dataUrl.indexOf(',');
  if (semicolon === -1 || comma === -1 || comma < semicolon) {
    return { valid: false, error: 'Invalid data URL format' };
  }

  const mime = dataUrl.slice(5, semicolon).toLowerCase().split(';')[0];
  if (!ALLOWED_MIMES.includes(mime)) {
    return { valid: false, error: 'Invalid image type. Allowed: jpeg, png, gif, webp' };
  }

  const base64 = dataUrl.slice(comma + 1);
  if (!base64) {
    return { valid: false, error: 'Empty image data' };
  }

  // Approximate decoded size: base64 is ~4/3 of original
  const estimatedBytes = (base64.length * 3) / 4;
  if (estimatedBytes > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image too large. Maximum size is ${maxMB}MB`,
    };
  }

  return { valid: true, dataUrl, mime };
}

/**
 * Convert a File/Blob to a base64 data URL (for use when client sends FormData file
 * but we want to store as base64).
 */
export async function fileToDataUrl(
  file: File | Blob,
  maxBytes: number = 2 * 1024 * 1024
): Promise<Base64ImageResult> {
  const type = file.type || 'image/png';
  if (!ALLOWED_MIMES.some((m) => type === m || type.startsWith(m + ';'))) {
    return { valid: false, error: 'Invalid file type. Allowed: jpeg, png, gif, webp' };
  }
  if (file.size > maxBytes) {
    const maxMB = (maxBytes / (1024 * 1024)).toFixed(1);
    return { valid: false, error: `File too large. Maximum size is ${maxMB}MB` };
  }
  const buffer = Buffer.from(await (file as Blob).arrayBuffer());
  const base64 = buffer.toString('base64');
  const dataUrl = `data:${type};base64,${base64}`;
  return { valid: true, dataUrl, mime: type };
}
