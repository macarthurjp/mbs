/**
 * Utilidades para manejo de fechas en zona horaria Argentina (UTC-3)
 */

/**
 * Convierte una fecha UTC a hora Argentina usando la zona horaria nativa
 */
export function toArgentinaTime(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  // Usar la API de zona horaria de JavaScript para conversión correcta
  const argentinaTimeString = d.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' });
  return new Date(argentinaTimeString);
}

/**
 * Obtiene la fecha actual en Argentina (sin hora)
 * Retorna en formato YYYY-MM-DD
 */
export function getTodayArgentina(): string {
  const now = new Date();
  const argentinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));

  const year = argentinaTime.getFullYear();
  const month = String(argentinaTime.getMonth() + 1).padStart(2, '0');
  const day = String(argentinaTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Convierte un timestamp UTC a fecha en formato argentino
 * @param timestamp - Timestamp en formato ISO UTC
 * @returns Fecha en formato DD/MM/YYYY
 */
export function formatArgentinaDate(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const argentinaTime = toArgentinaTime(date);

  const day = String(argentinaTime.getDate()).padStart(2, '0');
  const month = String(argentinaTime.getMonth() + 1).padStart(2, '0');
  const year = argentinaTime.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Convierte un timestamp UTC a fecha y hora en formato argentino
 * @param timestamp - Timestamp en formato ISO UTC
 * @returns Fecha y hora en formato DD/MM/YYYY HH:MM
 */
export function formatArgentinaDateTime(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const argentinaTime = toArgentinaTime(date);

  const day = String(argentinaTime.getDate()).padStart(2, '0');
  const month = String(argentinaTime.getMonth() + 1).padStart(2, '0');
  const year = argentinaTime.getFullYear();
  const hours = String(argentinaTime.getHours()).padStart(2, '0');
  const minutes = String(argentinaTime.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Obtiene la fecha en Argentina de un timestamp UTC (solo YYYY-MM-DD)
 */
export function getArgentinaDateString(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const argentinaTime = new Date(date.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));

  const year = argentinaTime.getFullYear();
  const month = String(argentinaTime.getMonth() + 1).padStart(2, '0');
  const day = String(argentinaTime.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Formatea un número como moneda en pesos argentinos
 */
export function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

/**
 * Formatea una fecha como fecha y hora legible
 * Alias para formatArgentinaDateTime
 */
export function formatDateTime(timestamp: string | Date): string {
  return formatArgentinaDateTime(timestamp);
}
