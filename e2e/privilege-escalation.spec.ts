import { test, expect, type Page } from '@playwright/test';
import 'dotenv/config';
import { hasE2ECredentials, loginAsTestOwner } from './utils/auth';

type SessionIdentity = {
  accessToken: string;
  userId: string;
};

async function getSessionIdentity(page: Page): Promise<SessionIdentity> {
  return page.evaluate(() => {
    const storageKey = Object.keys(window.localStorage).find(
      (key) => key.startsWith('sb-') && key.endsWith('-auth-token')
    );
    if (!storageKey) throw new Error('No Supabase session found.');

    const session = JSON.parse(window.localStorage.getItem(storageKey) as string);
    if (!session?.access_token || !session?.user?.id) {
      throw new Error('Incomplete Supabase session.');
    }

    return { accessToken: session.access_token, userId: session.user.id };
  });
}

async function rawUsuarioRequest(
  page: Page,
  identity: SessionIdentity,
  method: 'GET' | 'PATCH',
  body?: Record<string, unknown>
) {
  return page.evaluate(async ({ supabaseUrl, anonKey, identity, method, body }) => {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?id=eq.${identity.userId}&select=id,negocio_id,rol`,
      {
        method,
        headers: {
          apikey: anonKey as string,
          Authorization: `Bearer ${identity.accessToken}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: body ? JSON.stringify(body) : undefined
      }
    );

    return {
      status: response.status,
      body: await response.json().catch(() => null)
    };
  }, {
    supabaseUrl: process.env.VITE_SUPABASE_URL,
    anonKey: process.env.VITE_SUPABASE_ANON_KEY,
    identity,
    method,
    body
  });
}

test.describe('Privilege-escalation protection', () => {
  test('owner cannot grant platform-admin variants through the REST API', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'E2E owner credentials are not configured.');

    await loginAsTestOwner(page);
    const identity = await getSessionIdentity(page);
    const before = await rawUsuarioRequest(page, identity, 'GET');

    expect(before.status).toBe(200);
    expect(Array.isArray(before.body)).toBe(true);
    expect(before.body).toHaveLength(1);
    const originalRole = before.body[0].rol;

    let mutationOccurred = false;
    try {
      for (const role of ['super_admin', ' super_admin ', 'SUPER-ADMIN']) {
        const attempt = await rawUsuarioRequest(page, identity, 'PATCH', { rol: role });
        mutationOccurred ||= attempt.status < 400;
        expect(attempt.status, `role variant ${JSON.stringify(role)} must be rejected`).toBeGreaterThanOrEqual(400);
      }
    } finally {
      // A failing security probe must never leave the shared E2E account with
      // elevated privileges. Once a bypass succeeds, that session can restore
      // its original role before Playwright reports the assertion failure.
      if (mutationOccurred) {
        const cleanup = await rawUsuarioRequest(page, identity, 'PATCH', { rol: originalRole });
        expect(cleanup.status, 'security probe cleanup must restore the original role').toBe(200);
      }
    }

    const after = await rawUsuarioRequest(page, identity, 'GET');
    expect(after.status).toBe(200);
    expect(after.body[0].rol).toBe(originalRole);
  });

  test('owner cannot move their user to another business through the REST API', async ({ page }) => {
    test.skip(!hasE2ECredentials, 'E2E owner credentials are not configured.');

    await loginAsTestOwner(page);
    const identity = await getSessionIdentity(page);
    const before = await rawUsuarioRequest(page, identity, 'GET');
    const originalBusinessId = before.body[0].negocio_id;

    const attempt = await rawUsuarioRequest(page, identity, 'PATCH', {
      negocio_id: '00000000-0000-4000-8000-000000000001'
    });
    expect(attempt.status).toBeGreaterThanOrEqual(400);

    const after = await rawUsuarioRequest(page, identity, 'GET');
    expect(after.status).toBe(200);
    expect(after.body[0].negocio_id).toBe(originalBusinessId);
  });
});
