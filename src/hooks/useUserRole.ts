import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export type UserRole = 'view_only' | 'view_edit';

interface UserRoleData {
    role: UserRole;
    isSuperAdmin: boolean;
    isLoading: boolean;
}

export function useUserRole(): UserRoleData {
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const userId = user?.id || '';

    const { data, isLoading } = useQuery({
        queryKey: ['userRole', userId],
        queryFn: async () => {
            // 1. Try to fetch current user's role
            const { data: roleData, error } = await supabase
                .from('user_roles')
                .select('role, is_super_admin')
                .eq('user_id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching user role:', error);
                // If the table doesn't exist yet, treat as super admin (pre-migration)
                if (error.code === '42P01' || error.message?.includes('does not exist')) {
                    return { role: 'view_edit' as UserRole, is_super_admin: true };
                }
                return null;
            }

            // 2. If user has a role, return it
            if (roleData) return roleData;

            // 3. No role found — check if ANY roles exist in the table
            const { count, error: countError } = await supabase
                .from('user_roles')
                .select('*', { count: 'exact', head: true });

            if (countError || count === null || count === 0) {
                // No roles exist at all — this is the first user, auto-bootstrap as super admin
                try {
                    await supabase.from('user_roles').insert({
                        user_id: userId,
                        role: 'view_edit',
                        is_super_admin: true,
                    });
                    return { role: 'view_edit' as UserRole, is_super_admin: true };
                } catch (insertError) {
                    console.error('Error bootstrapping super admin:', insertError);
                    // Fallback: treat as super admin anyway
                    return { role: 'view_edit' as UserRole, is_super_admin: true };
                }
            }

            // 4. Other roles exist but current user has none — they're a new user without a role
            // Default to view_edit (backward compatibility for existing users before roles were added)
            try {
                await supabase.from('user_roles').insert({
                    user_id: userId,
                    role: 'view_edit',
                    is_super_admin: false,
                });
            } catch {
                // Ignore insert errors (might be RLS)
            }
            return { role: 'view_edit' as UserRole, is_super_admin: false };
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    return {
        role: (data?.role as UserRole) || 'view_edit',
        isSuperAdmin: data?.is_super_admin || false,
        isLoading,
    };
}
