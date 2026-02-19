import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Contract } from '@/types/contracts';

// NOTE: This hook is ready to be swapped in for 'useContracts' once Supabase is connected.
export function useSupabaseContracts() {
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContracts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) throw error;
            setContracts(data || []);
        } catch (err: any) {
            console.error('Error fetching contracts:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addContract = async (contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>) => {
        const { data, error } = await supabase
            .from('contracts')
            .insert([{
                ...contract,
                user_id: (await supabase.auth.getUser()).data.user?.id
            }])
            .select()
            .single();

        if (error) throw error;
        setContracts(prev => [...prev, data]);
        return data;
    };

    const updateContract = async (id: string, updates: Partial<Contract>) => {
        const { error } = await supabase
            .from('contracts')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
        setContracts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const deleteContract = async (id: string) => {
        const { error } = await supabase
            .from('contracts')
            .delete()
            .eq('id', id);

        if (error) throw error;
        setContracts(prev => prev.filter(c => c.id !== id));
    };

    // Initial fetch
    useEffect(() => {
        fetchContracts();
    }, []);

    return {
        contracts,
        loading,
        error,
        addContract,
        updateContract,
        deleteContract,
        refresh: fetchContracts
    };
}
