import { supabase } from '@/integrations/supabase/client';

export interface CreativeActivityData {
  action: 'uploaded_asset' | 'updated_asset' | 'deleted_asset' | 'created_collection' | 'updated_collection' | 'deleted_collection';
  entityType: 'asset' | 'collection';
  entityId: string;
  brandId: string;
  metadata?: Record<string, any>;
}

export async function logCreativeActivity(data: CreativeActivityData) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('Cannot log creative activity: No user authenticated');
      return;
    }

    const { error } = await supabase.from('creative_activity_logs').insert({
      action: data.action,
      entity_type: data.entityType,
      entity_id: data.entityId,
      brand_id: data.brandId,
      user_id: user.id,
      metadata: data.metadata || null,
    });

    if (error) {
      console.error('Error logging creative activity:', error);
    }
  } catch (error) {
    console.error('Error in logCreativeActivity:', error);
  }
}
