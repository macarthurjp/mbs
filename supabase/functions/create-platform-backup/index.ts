import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

type BackupRow = Record<string, unknown>;

type BackupTableExport = {
  label: string;
  fileName: string;
  rows: BackupRow[];
  count: number;
  skipped?: boolean;
  error?: string;
};

type BackupFile = {
  name: string;
  content: string;
};

const SUPABASE_URL = Deno.env.get('APP_SUPABASE_URL') || Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ANON_KEY = Deno.env.get('APP_SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
const CRON_SECRET = Deno.env.get('PLATFORM_BACKUP_CRON_SECRET') || '';
const NOTIFY_EMAIL = Deno.env.get('PLATFORM_BACKUP_NOTIFY_EMAIL') || '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'MatMax Backups <onboarding@resend.dev>';
const BUCKET = 'platform-backups';
const KEEP_AUTOMATIC_BACKUPS = Number(Deno.env.get('PLATFORM_BACKUP_KEEP_AUTOMATIC') || 30);

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing APP_SUPABASE_URL or APP_SUPABASE_SERVICE_ROLE_KEY');
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PLATFORM_BACKUP_TABLES = [
  { table: 'negocios', fileName: 'negocios.json', label: 'Negocios' },
  { table: 'usuarios', fileName: 'usuarios.json', label: 'Usuarios' },
  { table: 'clientes', fileName: 'clientes.json', label: 'Clientes' },
  { table: 'productos', fileName: 'productos.json', label: 'Productos' },
  { table: 'ventas', fileName: 'ventas.json', label: 'Ventas' },
  { table: 'venta_items', fileName: 'venta_items.json', label: 'Items de ventas' },
  { table: 'pagos', fileName: 'pagos.json', label: 'Pagos' },
  { table: 'compras', fileName: 'compras.json', label: 'Compras' },
  { table: 'cotizaciones', fileName: 'cotizaciones.json', label: 'Cotizaciones' },
  { table: 'cotizacion_detalles', fileName: 'cotizacion_detalles.json', label: 'Detalles de cotizaciones' },
  { table: 'suscripciones', fileName: 'suscripciones.json', label: 'Suscripciones' },
  { table: 'notifications', fileName: 'notificaciones.json', label: 'Notificaciones' },
  { table: 'support_tickets', fileName: 'tickets_soporte.json', label: 'Tickets de soporte' },
  { table: 'cashbox_closures', fileName: 'cierres_caja.json', label: 'Cierres de caja' },
  { table: 'audit_logs', fileName: 'auditoria.json', label: 'Auditoria' },
];

const textEncoder = new TextEncoder();

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let crc = index;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
    table[index] = crc >>> 0;
  }

  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function setUint16(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function setUint32(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function getDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();

  return { dosDate, dosTime };
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function createZipBlob(files: BackupFile[]) {
  const now = new Date();
  const { dosDate, dosTime } = getDosDateTime(now);
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const contentBytes = textEncoder.encode(file.content);
    const checksum = crc32(contentBytes);
    const localHeader = new Uint8Array(30 + nameBytes.length);

    setUint32(localHeader, 0, 0x04034b50);
    setUint16(localHeader, 4, 20);
    setUint16(localHeader, 6, 0x0800);
    setUint16(localHeader, 8, 0);
    setUint16(localHeader, 10, dosTime);
    setUint16(localHeader, 12, dosDate);
    setUint32(localHeader, 14, checksum);
    setUint32(localHeader, 18, contentBytes.length);
    setUint32(localHeader, 22, contentBytes.length);
    setUint16(localHeader, 26, nameBytes.length);
    setUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);
    localChunks.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    setUint32(centralHeader, 0, 0x02014b50);
    setUint16(centralHeader, 4, 20);
    setUint16(centralHeader, 6, 20);
    setUint16(centralHeader, 8, 0x0800);
    setUint16(centralHeader, 10, 0);
    setUint16(centralHeader, 12, dosTime);
    setUint16(centralHeader, 14, dosDate);
    setUint32(centralHeader, 16, checksum);
    setUint32(centralHeader, 20, contentBytes.length);
    setUint32(centralHeader, 24, contentBytes.length);
    setUint16(centralHeader, 28, nameBytes.length);
    setUint16(centralHeader, 30, 0);
    setUint16(centralHeader, 32, 0);
    setUint16(centralHeader, 34, 0);
    setUint16(centralHeader, 36, 0);
    setUint32(centralHeader, 38, 0);
    setUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);
    centralChunks.push(centralHeader);

    offset += localHeader.length + contentBytes.length;
  }

  const centralDirectory = concatBytes(centralChunks);
  const endRecord = new Uint8Array(22);
  setUint32(endRecord, 0, 0x06054b50);
  setUint16(endRecord, 4, 0);
  setUint16(endRecord, 6, 0);
  setUint16(endRecord, 8, files.length);
  setUint16(endRecord, 10, files.length);
  setUint32(endRecord, 12, centralDirectory.length);
  setUint32(endRecord, 16, offset);
  setUint16(endRecord, 20, 0);

  return new Blob([concatBytes([...localChunks, centralDirectory, endRecord])], {
    type: 'application/zip',
  });
}

function getErrorMessage(error: unknown) {
  if (!error) return 'Error desconocido';
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  if (typeof error === 'object') {
    const errorRecord = error as Record<string, unknown>;
    const parts = [
      errorRecord.message,
      errorRecord.details,
      errorRecord.hint,
      errorRecord.code ? `code: ${errorRecord.code}` : null,
    ]
      .filter(Boolean)
      .map(String);

    if (parts.length > 0) return parts.join(' | ');

    try {
      return JSON.stringify(errorRecord);
    } catch {
      return 'Objeto de error no serializable';
    }
  }

  return String(error);
}

function createBackupReadme(params: { generatedAt: string; mode: string; fileCount: number }) {
  return [
    'MatMax Platform Backup',
    '',
    `Generated at: ${params.generatedAt}`,
    `Mode: ${params.mode}`,
    `JSON files: ${params.fileCount}`,
    '',
    'How to read this backup:',
    '- Open _metadata.json first.',
    '- Every module is stored as a separate JSON file.',
    '- Each file contains records, skipped, error, and data.',
    '- If skipped is true, the table was unavailable or failed during export.',
    '',
    'Restore note:',
    '- This ZIP is an export backup, not an automatic restore package yet.',
    '- Restoring should be done carefully by a technical admin after reviewing the JSON files.',
  ].join('\n');
}

function escapeHtml(value: unknown) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

async function getBackupNotificationRecipients() {
  const configuredRecipients = NOTIFY_EMAIL
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (configuredRecipients.length > 0) return configuredRecipients;

  const { data, error } = await admin
    .from('usuarios')
    .select('email')
    .in('rol', ['superadmin', 'super_admin']);

  if (error) {
    console.error('Could not load backup notification recipients:', error);
    return [];
  }

  return Array.from(
    new Set(
      (data || [])
        .map((row) => String(row.email || '').trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

async function sendBackupNotification(params: {
  success: boolean;
  mode: string;
  fileName?: string;
  storagePath?: string | null;
  sizeBytes?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}) {
  if (params.mode !== 'automatic') return { sent: false, reason: 'manual_mode' };
  if (!RESEND_API_KEY) {
    console.warn('Backup notification skipped: RESEND_API_KEY is not configured');
    return { sent: false, reason: 'missing_resend_api_key' };
  }

  const recipients = await getBackupNotificationRecipients();
  if (recipients.length === 0) {
    console.warn('Backup notification skipped: no recipients configured');
    return { sent: false, reason: 'missing_recipients' };
  }

  const summary = (params.metadata?.summary || {}) as Record<string, unknown>;
  const generatedAt = String(params.metadata?.generated_at || new Date().toISOString());
  const subject = params.success
    ? 'Backup automatico completado - MatMax'
    : 'ALERTA: Backup automatico fallo - MatMax';

  const html = params.success
    ? `
      <div style="font-family: Arial, sans-serif; color: #18181b;">
        <h2>Backup automatico completado</h2>
        <p>El backup de plataforma se completo correctamente.</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 640px;">
          <tr><td style="padding: 6px 0;"><strong>Fecha UTC</strong></td><td>${escapeHtml(generatedAt)}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Archivo</strong></td><td>${escapeHtml(params.fileName)}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Tamano</strong></td><td>${escapeHtml(formatBytes(Number(params.sizeBytes || 0)))}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Storage</strong></td><td>${escapeHtml(`${BUCKET}/${params.storagePath || ''}`)}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Tablas exportadas</strong></td><td>${escapeHtml(summary.exported_tables)}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Tablas omitidas</strong></td><td>${escapeHtml(summary.skipped_tables)}</td></tr>
          <tr><td style="padding: 6px 0;"><strong>Registros</strong></td><td>${escapeHtml(summary.total_records)}</td></tr>
        </table>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; color: #18181b;">
        <h2 style="color: #b91c1c;">Backup automatico fallo</h2>
        <p>El backup automatico de plataforma no pudo completarse.</p>
        <p><strong>Fecha UTC:</strong> ${escapeHtml(new Date().toISOString())}</p>
        <p><strong>Error:</strong></p>
        <pre style="white-space: pre-wrap; background: #fef2f2; border: 1px solid #fecaca; padding: 12px; border-radius: 8px;">${escapeHtml(params.error)}</pre>
      </div>
    `;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: recipients,
      subject,
      html,
    }),
  });

  const data = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    console.error('Backup notification email failed:', data);
    return {
      sent: false,
      reason: String(data?.message || data?.error || 'resend_error'),
      recipients,
    };
  }

  return {
    sent: true,
    id: data?.id || null,
    recipients,
  };
}

async function requirePlatformAdmin(req: Request) {
  if (!ANON_KEY) throw new Error('Missing APP_SUPABASE_ANON_KEY');

  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader) throw new Error('Authorization es obligatorio');

  const authClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) throw new Error('Usuario no autenticado');

  const { data: profile, error: profileError } = await admin
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) throw profileError;

  const role = String(profile?.rol || '').trim().toLowerCase().replace('-', '_');
  if (role !== 'superadmin' && role !== 'super_admin') {
    throw new Error('Solo un superadmin puede ejecutar este backup');
  }

  return user.id;
}

async function authorize(req: Request) {
  const cronSecret = req.headers.get('x-backup-secret') || '';

  if (CRON_SECRET && cronSecret && cronSecret === CRON_SECRET) {
    return { mode: 'automatic', userId: null };
  }

  return {
    mode: 'manual',
    userId: await requirePlatformAdmin(req),
  };
}

async function fetchFullTable(config: { table: string; fileName: string; label: string }): Promise<BackupTableExport> {
  const rows: BackupRow[] = [];
  const pageSize = 1000;
  let from = 0;

  try {
    while (true) {
      const { data, error } = await admin
        .from(config.table)
        .select('*')
        .range(from, from + pageSize - 1);

      if (error) throw error;

      const pageRows = (data || []) as BackupRow[];
      rows.push(...pageRows);

      if (pageRows.length < pageSize) break;
      from += pageSize;
    }

    return {
      label: config.label,
      fileName: config.fileName,
      rows,
      count: rows.length,
    };
  } catch (error) {
    return {
      label: config.label,
      fileName: config.fileName,
      rows: [],
      count: 0,
      skipped: true,
      error: getErrorMessage(error),
    };
  }
}

async function cleanupOldAutomaticBackups() {
  if (!Number.isFinite(KEEP_AUTOMATIC_BACKUPS) || KEEP_AUTOMATIC_BACKUPS < 1) return;

  const { data, error } = await admin
    .from('platform_backups')
    .select('id, storage_bucket, storage_path')
    .eq('backup_type', 'platform')
    .like('storage_path', 'automatic/%')
    .order('created_at', { ascending: false });

  if (error || !data || data.length <= KEEP_AUTOMATIC_BACKUPS) return;

  const oldBackups = data.slice(KEEP_AUTOMATIC_BACKUPS);
  const paths = oldBackups.map((backup) => backup.storage_path).filter(Boolean) as string[];
  const ids = oldBackups.map((backup) => backup.id);

  if (paths.length > 0) {
    await admin.storage.from(BUCKET).remove(paths);
  }

  if (ids.length > 0) {
    await admin.from('platform_backups').delete().in('id', ids);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let fileName = 'matmax-platform-backup-failed.zip';
  let storagePath: string | null = null;
  let mode = 'manual';
  let createdBy: string | null = null;

  try {
    const auth = await authorize(req);
    mode = auth.mode;
    createdBy = auth.userId;

    const generatedAt = new Date().toISOString();
    const stamp = generatedAt.replace(/[:.]/g, '-');
    const rootFolder = `matmax-platform-backup-${stamp}`;
    fileName = `${rootFolder}.zip`;
    storagePath = `${mode}/${fileName}`;

    const allExports = await Promise.all(PLATFORM_BACKUP_TABLES.map((config) => fetchFullTable(config)));
    const skippedExports = allExports.filter((item) => item.skipped);
    const metadata = {
      app: 'MatMax Business Suite',
      type: 'platform_backup',
      version: 1,
      mode,
      generated_at: generatedAt,
      generated_by: {
        user_id: createdBy,
        source: mode === 'automatic' ? 'cron' : 'superadmin',
      },
      summary: {
        total_tables: allExports.length,
        exported_tables: allExports.filter((item) => !item.skipped).length,
        skipped_tables: skippedExports.length,
        total_records: allExports.reduce((sum, item) => sum + item.count, 0),
      },
      tables: allExports.map(({ label, fileName: exportFileName, count, skipped, error }) => ({
        label,
        file: exportFileName,
        records: count,
        skipped: Boolean(skipped),
        error: error || null,
      })),
      skipped_tables: skippedExports.map((item) => ({
        label: item.label,
        file: item.fileName,
        error: item.error || null,
      })),
      notes: [
        'Backup automatico de plataforma generado por Edge Function.',
        'Este ZIP se guarda en Supabase Storage y se registra en platform_backups.',
      ],
    };

    const zipFiles = [
      {
        name: `${rootFolder}/README_BACKUP.txt`,
        content: createBackupReadme({
          generatedAt,
          mode,
          fileCount: allExports.length,
        }),
      },
      {
        name: `${rootFolder}/_metadata.json`,
        content: JSON.stringify(metadata, null, 2),
      },
      ...allExports.map((item) => ({
        name: `${rootFolder}/${item.fileName}`,
        content: JSON.stringify(
          {
            label: item.label,
            exported_at: generatedAt,
            records: item.count,
            skipped: Boolean(item.skipped),
            error: item.error || null,
            data: item.rows,
          },
          null,
          2,
        ),
      })),
    ];

    const zipBlob = createZipBlob(zipFiles);
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, zipBlob, {
        contentType: 'application/zip',
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { error: insertError } = await admin.from('platform_backups').insert({
      created_by: createdBy,
      backup_type: 'platform',
      status: 'success',
      storage_bucket: BUCKET,
      storage_path: storagePath,
      file_name: fileName,
      size_bytes: zipBlob.size,
      metadata,
    });

    if (insertError) throw insertError;

    let notification: Record<string, unknown> | null = null;

    if (mode === 'automatic') {
      await cleanupOldAutomaticBackups();
      notification = await sendBackupNotification({
        success: true,
        mode,
        fileName,
        storagePath,
        sizeBytes: zipBlob.size,
        metadata,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        mode,
        file_name: fileName,
        storage_bucket: BUCKET,
        storage_path: storagePath,
        size_bytes: zipBlob.size,
        notification,
        metadata,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (error) {
    const message = getErrorMessage(error);

    try {
      await admin.from('platform_backups').insert({
        created_by: createdBy,
        backup_type: 'platform',
        status: 'failed',
        storage_bucket: BUCKET,
        storage_path: storagePath,
        file_name: fileName,
        size_bytes: 0,
        metadata: { mode },
        error: message,
      });
    } catch (insertError) {
      console.error('Could not record failed platform backup:', insertError);
    }

    const notification = await sendBackupNotification({
      success: false,
      mode,
      fileName,
      storagePath,
      error: message,
    });

    return new Response(JSON.stringify({ success: false, error: message, notification }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
