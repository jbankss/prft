import { supabase } from '@/integrations/supabase/client';

export type CreativeAction = 
  | 'uploaded_asset' 
  | 'updated_asset' 
  | 'deleted_asset' 
  | 'created_collection' 
  | 'updated_collection' 
  | 'deleted_collection'
  | 'approved_session'
  | 'rejected_session'
  | 'commented'
  | 'annotated';

export interface CreativeActivityData {
  action: CreativeAction;
  entityType: 'asset' | 'collection' | 'session' | 'comment' | 'annotation';
  entityId: string;
  brandId: string;
  metadata?: {
    session_title?: string;
    file_count?: number;
    asset_title?: string;
    collection_name?: string;
    rejection_reason?: string;
    [key: string]: any;
  };
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
