import { supabase } from '@/integrations/supabase/client';

export interface ActivityLogData {
  action: 'created' | 'updated' | 'deleted';
  entityType: 'account' | 'charge' | 'invoice' | 'chat_message' | 'brand';
  entityId: string;
  changes?: Record<string, any>;
}

export async function logActivity(data: ActivityLogData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log activity: No user authenticated');
      return;
    }

    const { error } = await supabase.from('activity_logs').insert({
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      user_id: user.id,
      changes: data.changes || null,
    });

    if (error) {
      console.error('Error logging activity:', error);
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
  }
}
