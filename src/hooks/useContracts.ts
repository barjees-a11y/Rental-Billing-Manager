import { useState, useCallback, useMemo, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Contract, ContractStatus, BillingPeriod } from '@/types/contracts';
import { updateContractNextInvoiceDate } from '@/lib/invoiceDateLogic';
import { useToast } from '@/hooks/use-toast';

export function useContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchContracts = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('si_no', { ascending: true }); // Order by SI No

      if (error) {
        console.error('Error fetching contracts:', error);
        toast({
          title: 'Error fetching data',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      if (data) {
        // Transform snake_case to camelCase if needed, but assuming direct mapping for now
        // or ensure supabase returns compatible types.
        // If exact mapping is needed (e.g. valid camelCase in DB or transform here):
        // For simplicity and standard JS/Postgres mapping, supabase-js often returns data as is in DB.
        // Assuming we created DB columns as snake_case, we might need to map them to camelCase here
        // OR rely on JS standard. Let's map explicitly to match our Type.

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
          created_at: 'createdAt',
          updated_at: 'updatedAt'
        };

        const mappedContracts: Contract[] = data.map((item: any) => {
          const newItem: any = { ...item };
          Object.keys(keyMap).forEach(key => {
            if (item[key] !== undefined) {
              newItem[keyMap[key]] = item[key];
              delete newItem[key];
            }
          });
          return newItem as Contract;
        });

        setContracts(mappedContracts);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Initial fetch
  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

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

  const addContract = useCallback(async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    const nextInvoiceDate = updateContractNextInvoiceDate({ ...contract, id: '', createdAt: '', updatedAt: '' } as Contract) || undefined;

    // We let Supabase handle ID and default timestamps, and SI No via serial if not provided
    const payload = {
      ...toDbFormat(contract),
      next_invoice_date: nextInvoiceDate,
    };

    const { data, error } = await supabase
      .from('contracts')
      .insert([payload])
      .select()
      .single();

    if (error) {
      toast({ title: 'Failed to add contract', description: error.message, variant: 'destructive' });
      throw error;
    }

    // Refresh or update local state
    fetchContracts();
    return data;
  }, [fetchContracts, toast]);

  const updateContract = useCallback(async (id: string, updates: Partial<Contract>) => {
    // We need to fetch the current contract to calculate next invoice date properly if needed
    const current = contracts.find(c => c.id === id);
    if (!current) return;

    const updatedContract = { ...current, ...updates };

    if (updates.billingPeriod || updates.invoiceDay || updates.quarterlyMonths || updates.startDate) {
      updatedContract.nextInvoiceDate = updateContractNextInvoiceDate(updatedContract) || undefined;
    }

    const payload = {
      ...toDbFormat(updates),
      next_invoice_date: updatedContract.nextInvoiceDate,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('contracts')
      .update(payload)
      .eq('id', id);

    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    } else {
      setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates, nextInvoiceDate: updatedContract.nextInvoiceDate } : c));
      toast({ title: 'Contract updated' });
    }
  }, [contracts, toast]);

  const deleteContract = useCallback(async (id: string) => {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    } else {
      setContracts(prev => prev.filter(c => c.id !== id));
      toast({ title: 'Contract deleted' });
    }
  }, [toast]);

  const terminateContract = useCallback(async (id: string, terminationDate: string, reason: string) => {
    await updateContract(id, {
      status: 'pulled_out',
      terminationDate,
      terminationReason: reason
    });
  }, [updateContract]);

  const getContract = useCallback((id: string) => {
    return contracts.find(contract => contract.id === id);
  }, [contracts]);

  const importContracts = useCallback(async (newContracts: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    // Prepare bulk insert data

    // NOTE: For bulk import, we might want to handle duplicates. 
    // Supabase upsert requires a unique constraint.
    // 'contract_number' should be unique ideally.
    // Here we will try to upsert based on 'contract_number'.

    const contractsToUpsert = newContracts.map(c => {
      const nextInvoiceDate = updateContractNextInvoiceDate({ ...c, id: '', createdAt: '', updatedAt: '' } as Contract) || undefined;
      return {
        ...toDbFormat(c),
        next_invoice_date: nextInvoiceDate,
        updated_at: new Date().toISOString(), // Ensure updated_at is set for upserts
      };
    });

    // We assume 'contract_number' is a unique constraint in DB or we use onConflict
    const { error } = await supabase
      .from('contracts')
      .upsert(contractsToUpsert, { onConflict: 'contract_number' });

    if (error) {
      console.error('Import error:', error);
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
      return 0;
    }

    await fetchContracts();
    return contractsToUpsert.length;
  }, [fetchContracts, toast]);

  // Statistics (same as before)
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

  return {
    contracts,
    isLoading,
    addContract,
    updateContract,
    deleteContract,
    terminateContract,
    getContract,
    importContracts,
    stats,
  };
}
