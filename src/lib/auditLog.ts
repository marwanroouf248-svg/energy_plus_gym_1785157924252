import { createClient } from '@/lib/supabase/client';

export type AuditAction = 'create' | 'update' | 'delete';
export type AuditEntityType = 'lead' | 'subscriber' | 'package';

interface AuditLogParams {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  changes?: Record<string, any>;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export async function logAuditAction(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.from('audit_logs').insert({
      user_id: params.user.id,
      user_email: params.user.email || '',
      user_name: params.user.name || '',
      user_role: params.user.role || '',
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      entity_name: params.entityName,
      changes: params.changes || {},
    });
  } catch {
    // Audit log failures should not break the main operation
    console.warn('Audit log failed silently');
  }
}

export function getUserAuditInfo(user: any, userProfile: any) {
  return {
    id: user?.id || '',
    email: user?.email || '',
    name: userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '',
    role: userProfile?.role || user?.user_metadata?.role || '',
  };
}

export function buildChanges(before: Record<string, any> | null, after: Record<string, any>): Record<string, any> {
  if (!before) return { created: after };
  const changed: Record<string, any> = {};
  for (const key of Object.keys(after)) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed[key] = { from: before[key], to: after[key] };
    }
  }
  return changed;
}
