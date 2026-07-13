export function formatEmail(value: string | null | undefined, fallback = '-') {
  const email = String(value || '').trim().toLowerCase();
  return email || fallback;
}

export const DEFAULT_PHONE_PREFIX = '+1';
export const DEFAULT_PHONE_INPUT_VALUE = `${DEFAULT_PHONE_PREFIX} `;

export function sanitizePhoneInput(value: string) {
  return value.replace(/[^\d+\s()-]/g, '');
}

export function normalizePhoneForStorage(value: string | null | undefined) {
  const rawValue = String(value || '').trim();
  const digits = rawValue.replace(/\D/g, '');

  if (!digits || digits === '1') return null;

  if (rawValue.startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return `${DEFAULT_PHONE_PREFIX}${digits}`;
}

export function formatPhone(value: string | null | undefined, fallback = '-') {
  const rawValue = String(value || '').trim();
  if (!rawValue) return fallback;

  const hasInternationalPrefix = rawValue.startsWith('+');
  const digits = rawValue.replace(/\D/g, '');

  if (!digits) return fallback;

  if (hasInternationalPrefix && digits.startsWith('352')) {
    const national = digits.slice(3);
    const groups = national.match(/.{1,3}/g)?.join(' ') || national;
    return `+352 ${groups}`.trim();
  }

  if (hasInternationalPrefix && digits.startsWith('1') && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (!hasInternationalPrefix && digits.startsWith('1') && digits.length === 11) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  if (!hasInternationalPrefix && digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  const prefix = hasInternationalPrefix ? '+' : '';
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return `${prefix}${grouped}`;
}

export function normalizePhoneForLink(value: string | null | undefined) {
  const rawValue = String(value || '').trim();
  const digits = rawValue.replace(/\D/g, '');

  if (digits.length === 10) return `1${digits}`;
  return digits;
}
