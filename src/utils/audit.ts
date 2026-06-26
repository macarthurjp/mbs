import { supabase } from '../lib/supabase';

type AuditLogParams = {
  negocio_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  user_role?: string;
  action: string;
  module: string;
  record_id?: string | number;
  description?: string;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
};

export async function logAudit(params: AuditLogParams) {
  try {
    await supabase.from('audit_logs').insert({
      negocio_id: params.negocio_id,
      user_id: params.user_id,
      user_name: params.user_name || null,
      user_email: params.user_email || null,
      user_role: params.user_role || null,
      action: params.action,
      module: params.module,
      record_id: params.record_id ? String(params.record_id) : null,
      description: params.description || null,
      old_data: params.old_data || null,
      new_data: params.new_data || null
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
}