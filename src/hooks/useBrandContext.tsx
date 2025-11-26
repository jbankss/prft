import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface BrandContextType {
  currentBrand: any | null;
  availableBrands: any[];
  switchBrand: (brandId: string) => Promise<void>;
  loading: boolean;
  isMJAdmin: boolean;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentBrand, setCurrentBrand] = useState<any | null>(null);
  const [availableBrands, setAvailableBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMJAdmin, setIsMJAdmin] = useState(false);

  useEffect(() => {
    if (!user) {
      setCurrentBrand(null);
      setAvailableBrands([]);
      setLoading(false);
      return;
    }

    const fetchUserBrands = async () => {
      try {
        // Get user's approved brands
        const { data: userRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*, brands(*)')
          .eq('user_id', user.id)
          .eq('approved', true);

        if (rolesError) throw rolesError;

        const brands = userRoles?.map(ur => ur.brands).filter(Boolean) || [];
        setAvailableBrands(brands);

        // Check if user is MJ Admin
        const mjBrand = brands.find((b: any) => b.name === 'MJ Fashion Team');
        const mjRole = userRoles?.find(ur => ur.brand_id === mjBrand?.id && ur.role === 'admin');
        setIsMJAdmin(!!mjRole);

        // Set current brand from profile or first available brand
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_brand_id')
          .eq('id', user.id)
          .single();

        if (profile?.current_brand_id) {
          const brand = brands.find((b: any) => b.id === profile.current_brand_id);
          if (brand) {
            setCurrentBrand(brand);
          } else if (brands.length > 0) {
            setCurrentBrand(brands[0]);
          }
        } else if (brands.length > 0) {
          setCurrentBrand(brands[0]);
          // Save the default brand
          await supabase
            .from('profiles')
            .update({ current_brand_id: brands[0].id })
            .eq('id', user.id);
        }
      } catch (error: any) {
        console.error('Error fetching user brands:', error);
        toast.error('Failed to load stores');
      } finally {
        setLoading(false);
      }
    };

    fetchUserBrands();
  }, [user]);

  const switchBrand = async (brandId: string) => {
    if (!user) return;

    try {
      const brand = availableBrands.find(b => b.id === brandId);
      if (!brand) {
        toast.error('Store not found');
        return;
      }

      await supabase
        .from('profiles')
        .update({ current_brand_id: brandId })
        .eq('id', user.id);

      setCurrentBrand(brand);
      toast.success(`Switched to ${brand.name}`);
    } catch (error: any) {
      console.error('Error switching brand:', error);
      toast.error('Failed to switch store');
    }
  };

  return (
    <BrandContext.Provider value={{ currentBrand, availableBrands, switchBrand, loading, isMJAdmin }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrandContext() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrandContext must be used within a BrandProvider');
  }
  return context;
}
