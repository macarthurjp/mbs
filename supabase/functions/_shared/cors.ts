// Shared CORS handling for edge functions. Reuses APP_ALLOWED_HOSTS (already
// set as a Supabase secret to validate Stripe redirect URLs) as the CORS
// origin allowlist too, instead of `Access-Control-Allow-Origin: '*'`.
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

function getAllowedHosts(): string[] {
  const configured = (Deno.env.get('APP_ALLOWED_HOSTS') || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return [...LOCAL_HOSTS, ...configured];
}

export function getCorsHeaders(
  req: Request,
  options: { methods?: string; headers?: string } = {}
): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  let allowOrigin = '';

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (getAllowedHosts().includes(hostname)) {
      allowOrigin = origin;
    }
  } catch {
    // Missing/invalid Origin header (e.g. a server-to-server call like the
    // Stripe webhook) — no CORS header needed, only browsers enforce it.
  }

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': options.headers || 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': options.methods || 'POST, OPTIONS',
    Vary: 'Origin',
  };
}
