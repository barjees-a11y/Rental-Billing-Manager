import { useCallback, useEffect, useId, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { ContractCategory, DeviceBrand, DeviceModel } from '@/types/contracts';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

// Pre-migration databases simply have no catalog tables yet -> behave as empty.
const isMissingTableError = (error: { code?: string; message?: string } | null) =>
  !!error && (error.code === '42P01' || (error.message || '').includes('does not exist'));

/**
 * Global (shared) device catalog.
 * Reads are available to every authenticated user, writes are restricted to
 * super admins (both here and by RLS on device_brands / device_models).
 *
 * category = 'copier' -> the "brands" are copier brands (Canon, Ricoh, ...)
 * category = 'other'  -> the "brands" are device types (Shredder, Paper Cut, ...)
 */
export function useDeviceCatalog(category: ContractCategory) {
  const { user } = useAuth();
  const { isSuperAdmin } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const instanceId = useId();
  const userId = user?.id || '';

  const { data: brands = [], isLoading: isBrandsLoading } = useQuery({
    queryKey: ['deviceBrands', category],
    queryFn: async (): Promise<DeviceBrand[]> => {
      const { data, error } = await supabase
        .from('device_brands')
        .select('id, category, name, created_at')
        .eq('category', category)
        .order('name', { ascending: true });

      if (error) {
        if (!isMissingTableError(error)) {
          console.error('Error fetching device brands:', error);
        }
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        category: row.category as ContractCategory,
        name: row.name,
        createdAt: row.created_at,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: models = [], isLoading: isModelsLoading } = useQuery({
    queryKey: ['deviceModels', category],
    queryFn: async (): Promise<DeviceModel[]> => {
      const { data, error } = await supabase
        .from('device_models')
        .select('id, brand_id, name, created_at')
        .order('name', { ascending: true });

      if (error) {
        if (!isMissingTableError(error)) {
          console.error('Error fetching device models:', error);
        }
        return [];
      }

      return (data || []).map((row: any) => ({
        id: row.id,
        brandId: row.brand_id,
        name: row.name,
        createdAt: row.created_at,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  // Realtime: refresh the catalog when another tab/user edits it
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`device_catalog_changes_${instanceId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_brands' }, () => {
        queryClient.invalidateQueries({ queryKey: ['deviceBrands'] });
        queryClient.invalidateQueries({ queryKey: ['deviceModels'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'device_models' }, () => {
        queryClient.invalidateQueries({ queryKey: ['deviceModels'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, instanceId]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['deviceBrands', category] });
    queryClient.invalidateQueries({ queryKey: ['deviceModels', category] });
  }, [queryClient, category]);

  const requireSuperAdmin = useCallback((): boolean => {
    if (isSuperAdmin) return true;
    toast({
      title: 'Not allowed',
      description: 'Only super administrators can manage the device catalog.',
      variant: 'destructive',
    });
    return false;
  }, [isSuperAdmin, toast]);

  const writeMutation = useMutation({
    mutationFn: async (run: () => Promise<void>) => {
      await run();
      return true;
    },
    onSuccess: invalidate,
    onError: (error: Error) => {
      toast({ title: 'Catalog update failed', description: error.message, variant: 'destructive' });
    },
  });

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  const addBrand = useCallback(async (name: string) => {
    const clean = name.trim();
    if (!clean || !requireSuperAdmin()) return;
    if (brands.some(b => b.name.toLowerCase() === clean.toLowerCase())) {
      toast({ title: 'Already exists', description: `"${clean}" is already in the catalog.`, variant: 'destructive' });
      return;
    }
    return writeMutation.mutateAsync(async () => {
      const { error } = await supabase.from('device_brands').insert({ category, name: clean });
      if (error) throw error;
    });
  }, [brands, category, requireSuperAdmin, toast, writeMutation]);

  const renameBrand = useCallback(async (id: string, name: string) => {
    const clean = name.trim();
    if (!clean || !requireSuperAdmin()) return;
    return writeMutation.mutateAsync(async () => {
      const { error } = await supabase.from('device_brands').update({ name: clean }).eq('id', id);
      if (error) throw error;
    });
  }, [requireSuperAdmin, writeMutation]);

  const deleteBrand = useCallback(async (id: string) => {
    if (!requireSuperAdmin()) return;
    return writeMutation.mutateAsync(async () => {
      // device_models.brand_id has ON DELETE CASCADE -> models are removed too.
      const { error } = await supabase.from('device_brands').delete().eq('id', id);
      if (error) throw error;
    });
  }, [requireSuperAdmin, writeMutation]);

  const addModel = useCallback(async (brandId: string, name: string) => {
    const clean = name.trim();
    if (!clean || !requireSuperAdmin()) return;
    if (models.some(m => m.brandId === brandId && m.name.toLowerCase() === clean.toLowerCase())) {
      toast({ title: 'Already exists', description: `"${clean}" is already in the catalog.`, variant: 'destructive' });
      return;
    }
    return writeMutation.mutateAsync(async () => {
      const { error } = await supabase.from('device_models').insert({ brand_id: brandId, name: clean });
      if (error) throw error;
    });
  }, [models, requireSuperAdmin, toast, writeMutation]);

  const renameModel = useCallback(async (id: string, name: string) => {
    const clean = name.trim();
    if (!clean || !requireSuperAdmin()) return;
    return writeMutation.mutateAsync(async () => {
      const { error } = await supabase.from('device_models').update({ name: clean }).eq('id', id);
      if (error) throw error;
    });
  }, [requireSuperAdmin, writeMutation]);

  const deleteModel = useCallback(async (id: string) => {
    if (!requireSuperAdmin()) return;
    return writeMutation.mutateAsync(async () => {
      const { error } = await supabase.from('device_models').delete().eq('id', id);
      if (error) throw error;
    });
  }, [requireSuperAdmin, writeMutation]);

  // ---------------------------------------------------------------------------
  // Derived helpers
  // ---------------------------------------------------------------------------
  const brandNames = useMemo(() => brands.map(b => b.name), [brands]);

  const modelsForBrand = useCallback((brandName: string | undefined): string[] => {
    if (!brandName) return [];
    const brand = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
    if (!brand) return [];
    return models.filter(m => m.brandId === brand.id).map(m => m.name);
  }, [brands, models]);

  return {
    brands,
    brandNames,
    models,
    modelsForBrand,
    addBrand,
    renameBrand,
    deleteBrand,
    addModel,
    renameModel,
    deleteModel,
    canManage: isSuperAdmin,
    isLoading: isBrandsLoading || isModelsLoading || writeMutation.isPending,
  };
}
