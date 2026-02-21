import { useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Contract, ContractStatus, BillingPeriod } from '@/types/contracts';
import { updateContractNextInvoiceDate } from '@/lib/invoiceDateLogic';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export function useContracts() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Helper to validate UUID
  const isValidUUID = (uuid: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
  };

  // Helper to get a valid user ID for DB
  const getDbUserId = () => {
    if (!user?.id) return '4ffbfe41-03a3-4983-9bdc-e72ab761df38';
    if (isValidUUID(user.id)) return user.id;
    console.warn('User ID is not a valid UUID:', user.id, 'Using fallback Supabase UID.');
    return '4ffbfe41-03a3-4983-9bdc-e72ab761df38';
  };

  const userId = getDbUserId();

  // Helper to map DB snake_case to Frontend camelCase
  const fromDbFormat = (item: any): Contract => {
    const keyMap: any = {
      si_no: 'siNo',
      contract_number: 'contractNumber',
      machine_site: 'machineSite',
      billing_period: 'billingPeriod',
      invoice_day: 'invoiceDay',
      quarterly_months: 'quarterlyMonths',
      rental_fee: 'rentalFee',
      start_date: 'startDate',
      end_date: 'endDate',
      pullout_date: 'pulloutDate',
      termination_date: 'terminationDate',
      termination_reason: 'terminationReason',
      next_invoice_date: 'nextInvoiceDate',
      last_invoice_date: 'lastInvoiceDate',
      excess_count_bw: 'excessCountBW',
      excess_count_clr: 'excessCountClr',
      excess_rate_bw: 'excessRateBW',
      excess_rate_clr: 'excessRateClr',
      user_id: 'userId',
      created_at: 'createdAt',
      updated_at: 'updatedAt'
    };

    const newItem: any = { ...item };
    Object.keys(keyMap).forEach(key => {
      if (item[key] !== undefined) {
        newItem[keyMap[key]] = item[key];
        delete newItem[key];
      }
    });
    return newItem as Contract;
  };

  // Helper to reverse map camelCase to snake_case for DB
  const toDbFormat = (contract: Partial<Contract>) => {
    const keyMap: any = {
      siNo: 'si_no',
      contractNumber: 'contract_number',
      machineSite: 'machine_site',
      billingPeriod: 'billing_period',
      invoiceDay: 'invoice_day',
      quarterlyMonths: 'quarterly_months',
      rentalFee: 'rental_fee',
      startDate: 'start_date',
      endDate: 'end_date',
      pulloutDate: 'pullout_date',
      terminationDate: 'termination_date',
      terminationReason: 'termination_reason',
      nextInvoiceDate: 'next_invoice_date',
      lastInvoiceDate: 'last_invoice_date',
      excessCountBW: 'excess_count_bw',
      excessCountClr: 'excess_count_clr',
      excessRateBW: 'excess_rate_bw',
      excessRateClr: 'excess_rate_clr',
      userId: 'user_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    };

    const dbItem: any = {};
    Object.keys(contract).forEach((key) => {
      const val = (contract as any)[key];
      if (val !== undefined) {
        const dbKey = keyMap[key] || key;
        dbItem[dbKey] = val;
      }
    });
    return dbItem;
  };

  // 1. Query to fetch contracts
  const { data: contracts = [], isLoading: isFetching } = useQuery({
    queryKey: ['contracts', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', userId)
        .order('si_no', { ascending: true });

      if (error) {
        console.error('Error fetching contracts:', error);
        toast({ title: 'Error fetching data', description: error.message, variant: 'destructive' });
        return [];
      }

      return data ? data.map(fromDbFormat) : [];
    },
    enabled: !!userId,
  });

  // 2. Setup Realtime subscription for contracts
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('contracts_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contracts', filter: `user_id=eq.${userId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  // Mutations
  const addMutation = useMutation({
    mutationFn: async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
      const nextInvoiceDate = updateContractNextInvoiceDate({ ...contract, id: '', createdAt: '', updatedAt: '' } as Contract) || undefined;
      const payload = {
        ...toDbFormat(contract),
        next_invoice_date: nextInvoiceDate,
        user_id: userId,
      };

      const { data, error } = await supabase.from('contracts').insert([payload]).select().single();
      if (error) throw error;
      return fromDbFormat(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
    },
    onError: (error) => {
      toast({ title: 'Failed to add contract', description: error.message, variant: 'destructive' });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: Partial<Contract> }) => {
      const current = contracts.find(c => c.id === id);
      if (!current) throw new Error("Contract not found locally");

      const updatedContract = { ...current, ...updates };
      let finalNextInvoiceDate = current.nextInvoiceDate;

      if (updates.billingPeriod || updates.invoiceDay || updates.quarterlyMonths || updates.startDate) {
        finalNextInvoiceDate = updateContractNextInvoiceDate(updatedContract) || undefined;
      }

      const payload = {
        ...toDbFormat(updates),
        next_invoice_date: finalNextInvoiceDate,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('contracts').update(payload).eq('id', id);
      if (error) throw error;

      return { id, updates, finalNextInvoiceDate };
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['contracts', userId] });
      const previous = queryClient.getQueryData<Contract[]>(['contracts', userId]);

      if (previous) {
        queryClient.setQueryData<Contract[]>(['contracts', userId], old =>
          (old || []).map(c => c.id === id ? { ...c, ...updates } : c)
        );
      }
      return { previous };
    },
    onSuccess: () => {
      toast({ title: 'Contract updated' });
    },
    onError: (error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['contracts', userId], context.previous);
      }
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contracts').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      toast({ title: 'Contract deleted' });
      queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
    },
    onError: (error) => {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  });

  const importMutation = useMutation({
    mutationFn: async (newContracts: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>[]) => {
      const contractsToUpsert = newContracts.map(c => {
        const nextInvoiceDate = updateContractNextInvoiceDate({ ...c, id: '', createdAt: '', updatedAt: '' } as Contract) || undefined;
        return {
          ...toDbFormat(c),
          next_invoice_date: nextInvoiceDate,
          updated_at: new Date().toISOString(),
          user_id: userId,
        };
      });

      const { error } = await supabase.from('contracts').upsert(contractsToUpsert, { onConflict: 'contract_number' });
      if (error) throw error;
      return contractsToUpsert.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
    },
    onError: (error) => {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('contracts').delete().eq('user_id', userId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast({ title: 'All contracts cleared' });
      queryClient.invalidateQueries({ queryKey: ['contracts', userId] });
    },
    onError: (error) => {
      toast({ title: 'Clear failed', description: error.message, variant: 'destructive' });
    }
  });

  // Callbacks wrapper for the rest of the application
  const addContract = useCallback(async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    return addMutation.mutateAsync(contract);
  }, [addMutation]);

  const updateContract = useCallback(async (id: string, updates: Partial<Contract>) => {
    return updateMutation.mutateAsync({ id, updates });
  }, [updateMutation]);

  const deleteContract = useCallback(async (id: string) => {
    return deleteMutation.mutateAsync(id);
  }, [deleteMutation]);

  const terminateContract = useCallback(async (id: string, terminationDate: string, reason: string) => {
    return updateMutation.mutateAsync({
      id,
      updates: {
        status: 'pulled_out',
        terminationDate,
        terminationReason: reason
      }
    });
  }, [updateMutation]);

  const getContract = useCallback((id: string) => {
    return contracts.find(contract => contract.id === id);
  }, [contracts]);

  const importContracts = useCallback(async (newContracts: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    return importMutation.mutateAsync(newContracts);
  }, [importMutation]);

  const clearAllContracts = useCallback(async () => {
    return clearAllMutation.mutateAsync();
  }, [clearAllMutation]);

  // Statistics
  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active').length;

    const byPeriod = contracts.reduce((acc, c) => {
      if (c.billingPeriod) {
        acc[c.billingPeriod] = (acc[c.billingPeriod] || 0) + 1;
      }
      return acc;
    }, {} as Record<BillingPeriod, number>);

    const byStatus = contracts.reduce((acc, c) => {
      if (c.status) {
        acc[c.status] = (acc[c.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<ContractStatus, number>);

    const byInvoiceDay = contracts.reduce((acc, c) => {
      if (c.invoiceDay) {
        acc[c.invoiceDay] = (acc[c.invoiceDay] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);

    return {
      total: contracts.filter(c => c.status !== 'pulled_out' && c.status !== 'archived').length,
      active,
      byPeriod,
      byStatus,
      byInvoiceDay,
    };
  }, [contracts]);

  const isLoading = isFetching || addMutation.isPending || updateMutation.isPending || deleteMutation.isPending || importMutation.isPending || clearAllMutation.isPending;

  return {
    contracts,
    isLoading,
    addContract,
    updateContract,
    deleteContract,
    terminateContract,
    getContract,
    importContracts,
    clearAllContracts,
    stats,
  };
}
