import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';
import { useBrandContext } from './useBrandContext';
import { supabase } from '@/integrations/supabase/client';

export type CreativeRole = 'creative' | 'senior_creative' | 'creative_director' | null;

export interface CreativePermissions {
  role: CreativeRole;
  roleLevel: number;
  canUploadDirect: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canDownload: boolean;
  canComment: boolean;
  canAnnotate: boolean;
  canSeeApprovals: boolean;
  canApprove: boolean;
  canViewAllAssets: boolean;
  loading: boolean;
}

export function useCreativePermissions(): CreativePermissions {
  const { user } = useAuth();
  const { currentBrand, isMJAdmin } = useBrandContext();
  const [role, setRole] = useState<CreativeRole>(null);
  const [roleLevel, setRoleLevel] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCreativeRole() {
      if (!user || !currentBrand) {
        setRole(null);
        setRoleLevel(0);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('creative_role')
          .eq('user_id', user.id)
          .eq('brand_id', currentBrand.id)
          .eq('approved', true)
          .maybeSingle();

        if (error) throw error;

        const creativeRole = data?.creative_role as CreativeRole;
        setRole(creativeRole);
        
        // Calculate role level
        let level = 0;
        if (isMJAdmin) {
          level = 4; // Highest level for MJ admins
        } else if (creativeRole === 'creative_director') {
          level = 3;
        } else if (creativeRole === 'senior_creative') {
          level = 2;
        } else if (creativeRole === 'creative') {
          level = 1;
        }
        setRoleLevel(level);
      } catch (error) {
        console.error('Error fetching creative role:', error);
        setRole(null);
        setRoleLevel(0);
      } finally {
        setLoading(false);
      }
    }

    fetchCreativeRole();
  }, [user, currentBrand, isMJAdmin]);

  // If user is MJ admin, they have full permissions
  const effectiveLevel = isMJAdmin ? 4 : roleLevel;

  return {
    role,
    roleLevel: effectiveLevel,
    canUploadDirect: effectiveLevel >= 2, // Senior creative and above
    canEdit: effectiveLevel >= 2,
    canDelete: effectiveLevel >= 2,
    canDownload: effectiveLevel >= 1, // All creative roles
    canComment: effectiveLevel >= 1,
    canAnnotate: effectiveLevel >= 2,
    canSeeApprovals: effectiveLevel >= 2,
    canApprove: effectiveLevel >= 3, // Director only
    canViewAllAssets: effectiveLevel >= 2,
    loading,
  };
}
