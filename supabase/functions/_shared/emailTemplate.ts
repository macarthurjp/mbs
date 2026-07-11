// Shared branded HTML wrapper for transactional/system emails sent by Edge
// Functions (backup notifications, signup alerts, etc.), matching the
// black/gold look used across the landing page and Supabase Auth templates.

export function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type EmailSection = {
  heading: string;
  intro?: string;
  rows?: Array<[label: string, value: unknown]>;
  preformatted?: string;
};

export function renderBrandedEmail(params: {
  headerLabel: string;
  accentColor?: string;
  sections: EmailSection[];
}) {
  const accent = params.accentColor || '#f4c542';

  const sectionsHtml = params.sections
    .map((section, index) => {
      const rowsHtml = (section.rows || [])
        .map(
          ([label, value]) => `
            <tr>
              <td style="padding:6px 12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;color:#050505;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
              <td style="padding:6px 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#52525b;vertical-align:top;word-break:break-word;">${escapeHtml(value)}</td>
            </tr>
          `,
        )
        .join('');

      const preformattedHtml = section.preformatted
        ? `<pre style="white-space:pre-wrap;background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:8px;font-family:Menlo,Consolas,monospace;font-size:12px;color:#7f1d1d;margin:12px 0 0;">${escapeHtml(section.preformatted)}</pre>`
        : '';

      const divider = index > 0 ? '<tr><td style="padding:22px 0;"><div style="border-top:1px solid #f2eee3;"></div></td></tr>' : '';

      return `
        ${divider}
        <tr>
          <td>
            <h2 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:19px;color:#050505;">${escapeHtml(section.heading)}</h2>
            ${section.intro ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#52525b;">${escapeHtml(section.intro)}</p>` : ''}
            ${rowsHtml ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">${rowsHtml}</table>` : ''}
            ${preformattedHtml}
          </td>
        </tr>
      `;
    })
    .join('');

  return `
<!doctype html>
<html lang="es">
  <body style="margin:0;padding:0;background-color:#f7f4ec;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f4ec;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#050505;padding:24px 32px;">
                <span style="font-family:Georgia,'Times New Roman',serif;font-weight:bold;font-size:16px;color:${accent};letter-spacing:0.3px;">
                  MatMax Business Suite · ${escapeHtml(params.headerLabel)}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
                  ${sectionsHtml}
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#a1a1aa;">
            MatMax Business Suite · matmaxsuite.com
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}
