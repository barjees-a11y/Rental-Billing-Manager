import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { Contract, ContractStatus, BillingPeriod } from '@/types/contracts';
import { updateContractNextInvoiceDate } from '@/lib/invoiceDateLogic';
import { generateId } from '@/lib/utils';

const CONTRACTS_KEY = 'rental_billing_contracts';

export function useContracts() {
  const [contracts, setContracts] = useLocalStorage<Contract[]>(CONTRACTS_KEY, []);

  const addContract = useCallback((contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
    // Calculate next SI No
    const maxSiNo = contracts.reduce((max, c) => Math.max(max, c.siNo || 0), 0);

    const newContract: Contract = {
      ...contract,
      id: generateId(),
      siNo: contract.siNo || maxSiNo + 1,  // Use provided siNo or assign next
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Calculate next invoice date
    newContract.nextInvoiceDate = updateContractNextInvoiceDate(newContract) || undefined;
    setContracts(prev => [...prev, newContract]);
    return newContract;
  }, [contracts, setContracts]);

  const updateContract = useCallback((id: string, updates: Partial<Contract>) => {
    setContracts(prev => prev.map(contract => {
      if (contract.id !== id) return contract;
      const updated = { ...contract, ...updates, updatedAt: new Date().toISOString() };
      // Recalculate next invoice date if billing fields changed
      if (updates.billingPeriod || updates.invoiceDay || updates.quarterlyMonths || updates.startDate) {
        updated.nextInvoiceDate = updateContractNextInvoiceDate(updated) || undefined;
      }
      return updated;
    }));
  }, [setContracts]);

  const deleteContract = useCallback((id: string) => {
    setContracts(prev => prev.filter(contract => contract.id !== id));
  }, [setContracts]);

  const terminateContract = useCallback((id: string, terminationDate: string, reason: string) => {
    setContracts(prev => prev.map(contract => {
      if (contract.id !== id) return contract;
      return {
        ...contract,
        status: 'pulled_out', // Or 'archived' if preferred, but usually pulled_out implies termination
        terminationDate,
        terminationReason: reason,
        updatedAt: new Date().toISOString(),
      };
    }));
  }, [setContracts]);

  const getContract = useCallback((id: string) => {
    return contracts.find(contract => contract.id === id);
  }, [contracts]);

  const importContracts = useCallback((newContracts: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    // Assign SI No sequentially based on import order
    const contractsToAdd = newContracts.map((contract, index) => {
      const newContract: Contract = {
        ...contract,
        id: generateId(),
        siNo: contract.siNo || index + 1,  // Use provided siNo or assign based on import order
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      newContract.nextInvoiceDate = updateContractNextInvoiceDate(newContract) || undefined;
      return newContract;
    });

    // Upsert logic: update existing by contractNumber or add new
    setContracts(prev => {
      const existingMap = new Map(prev.map(c => [c.contractNumber, c]));

      contractsToAdd.forEach((newContract, index) => {
        const existing = existingMap.get(newContract.contractNumber);
        if (existing) {
          // Update existing but preserve siNo if it exists
          const updated = {
            ...existing,
            ...newContract,
            id: existing.id,
            siNo: existing.siNo || newContract.siNo,  // Preserve existing siNo
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString(),
          };
          updated.nextInvoiceDate = updateContractNextInvoiceDate(updated) || undefined;
          existingMap.set(newContract.contractNumber, updated);
        } else {
          // Add new
          existingMap.set(newContract.contractNumber, newContract);
        }
      });

      return Array.from(existingMap.values());
    });

    return contractsToAdd.length;
  }, [setContracts]);

  // Statistics
  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active').length;

    const byPeriod = contracts.reduce((acc, c) => {
      acc[c.billingPeriod] = (acc[c.billingPeriod] || 0) + 1;
      return acc;
    }, {} as Record<BillingPeriod, number>);

    const byStatus = contracts.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    }, {} as Record<ContractStatus, number>);

    const byInvoiceDay = contracts.reduce((acc, c) => {
      acc[c.invoiceDay] = (acc[c.invoiceDay] || 0) + 1;
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
    addContract,
    updateContract,
    deleteContract,
    terminateContract,
    getContract,
    importContracts,
    stats,
  };
}
