const RELOAD_GUARD_KEY = 'mbsuite-chunk-reload-attempted';

// Matches the errors browsers throw when a lazy-loaded chunk from a
// previous deploy no longer exists (stale tab after a new build).
const CHUNK_ERROR_PATTERN =
  /dynamically imported module|valid JavaScript MIME type|module script failed/i;

export function reloadOnChunkError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  if (!CHUNK_ERROR_PATTERN.test(message)) return;
  if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;

  sessionStorage.setItem(RELOAD_GUARD_KEY, '1');
  window.location.reload();
}

export function clearChunkReloadGuard(): void {
  sessionStorage.removeItem(RELOAD_GUARD_KEY);
}
