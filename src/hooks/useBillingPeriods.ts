import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { BillingPeriodConfig, DEFAULT_BILLING_PERIODS } from '@/types/contracts';

export function useBillingPeriods() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id || '';

  // Fetch settings from Supabase
  const { data: customPeriods = [], isLoading: isFetching } = useQuery({
    queryKey: ['billingPeriods', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_settings')
        .select('billing_periods')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching billing periods:', error);
        return [];
      }

      return (data?.billing_periods as BillingPeriodConfig[]) || [];
    },
    enabled: !!userId,
  });

  // Setup Realtime Subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('user_settings_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate cache when DB changes from another browser tab
          queryClient.invalidateQueries({ queryKey: ['billingPeriods', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Combine default with custom
  const allPeriods = useMemo((): BillingPeriodConfig[] => {
    return [
      ...DEFAULT_BILLING_PERIODS.filter(
        (p) => !customPeriods.some((c) => c.code === p.code)
      ),
      ...customPeriods,
    ];
  }, [customPeriods]);

  // Mutation to persist updates securely
  const mutation = useMutation({
    mutationFn: async (updatedPeriods: BillingPeriodConfig[]) => {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          billing_periods: updatedPeriods,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;
      return updatedPeriods;
    },
    // Optimistic Update! Applies locally instantly while DB updates
    onMutate: async (updatedPeriods) => {
      await queryClient.cancelQueries({ queryKey: ['billingPeriods', userId] });
      const previous = queryClient.getQueryData(['billingPeriods', userId]);
      queryClient.setQueryData(['billingPeriods', userId], updatedPeriods);
      return { previous };
    },
    onError: (err, newSettings, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['billingPeriods', userId], context.previous);
      }
      console.error('Failed to save periods:', err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['billingPeriods', userId] });
    },
  });

  const addPeriod = useCallback((period: Omit<BillingPeriodConfig, 'isBuiltIn'>) => {
    const newPeriod: BillingPeriodConfig = { ...period, isBuiltIn: false };
    mutation.mutate([...customPeriods, newPeriod]);
  }, [customPeriods, mutation]);

  const updatePeriod = useCallback((code: string, updates: Partial<BillingPeriodConfig>) => {
    const customIndex = customPeriods.findIndex((p) => p.code === code);
    let updatedPeriods = [...customPeriods];

    if (customIndex !== -1) {
      updatedPeriods[customIndex] = { ...updatedPeriods[customIndex], ...updates };
    } else {
      const builtIn = DEFAULT_BILLING_PERIODS.find((p) => p.code === code);
      if (builtIn) {
        updatedPeriods.push({ ...builtIn, ...updates, isBuiltIn: false });
      }
    }

    mutation.mutate(updatedPeriods);
  }, [customPeriods, mutation]);

  const deletePeriod = useCallback((code: string) => {
    const updatedPeriods = customPeriods.filter((p) => p.code !== code);
    mutation.mutate(updatedPeriods);
  }, [customPeriods, mutation]);

  const getPeriod = useCallback((code: string): BillingPeriodConfig | undefined => {
    const custom = customPeriods.find((p) => p.code === code);
    if (custom) return custom;
    return DEFAULT_BILLING_PERIODS.find((p) => p.code === code);
  }, [customPeriods]);

  const isCodeAvailable = useCallback((code: string): boolean => {
    return !allPeriods.some((p) => p.code.toLowerCase() === code.toLowerCase());
  }, [allPeriods]);

  return {
    allPeriods,
    customPeriods,
    addPeriod,
    updatePeriod,
    deletePeriod,
    getPeriod,
    isCodeAvailable,
    isLoading: isFetching || mutation.isPending,
  };
}