import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Users, Eye, Pencil, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/hooks/useUserRole';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ManagedUser {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isSuperAdmin: boolean;
}

export function UserManagementCard() {
    const { user, register } = useAuth();
    const { toast } = useToast();

    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('view_edit');
    const [isCreating, setIsCreating] = useState(false);
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchUsers = useCallback(async () => {
        setIsLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from('user_roles')
                .select('user_id, email, display_name, role, is_super_admin')
                .order('created_at', { ascending: true });

            if (error) throw error;

            const managedUsers: ManagedUser[] = (data || []).map((r: any) => ({
                id: r.user_id,
                email: r.email || (r.user_id === user?.id ? (user?.email || '') : `User ${r.user_id.slice(0, 8)}...`),
                name: r.display_name || (r.user_id === user?.id ? (user?.name || '') : ''),
                role: r.role as UserRole,
                isSuperAdmin: r.is_super_admin,
            }));

            setUsers(managedUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
        setIsLoadingUsers(false);
    }, [user]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = async () => {
        if (!newEmail || !newPassword || !newName) {
            toast({ title: 'Missing fields', description: 'Please fill in all fields.', variant: 'destructive' });
            return;
        }

        if (newPassword.length < 6) {
            toast({ title: 'Weak password', description: 'Password must be at least 6 characters.', variant: 'destructive' });
            return;
        }

        setIsCreating(true);

        try {
            // Step 1: Create the new user via Supabase Auth signUp
            const { success, error } = await register(newEmail, newName, newPassword);

            if (!success) {
                throw new Error(error || 'Failed to create user');
            }

            // Step 2: Get new user's session (signUp auto-logs in as new user)
            const { data: { session } } = await supabase.auth.getSession();
            const newUserId = session?.user?.id;

            if (newUserId && newUserId !== user?.id) {
                // Insert their role with email and display_name
                await supabase.from('user_roles').upsert({
                    user_id: newUserId,
                    email: newEmail,
                    display_name: newName,
                    role: newRole,
                    is_super_admin: false,
                }, { onConflict: 'user_id' });
            }

            // Step 3: Sign out new user, admin must re-login
            await supabase.auth.signOut();

            toast({
                title: 'User created successfully!',
                description: `${newName} (${newEmail}) added as ${newRole === 'view_only' ? 'View Only' : 'View & Edit'}. Please log back in.`,
            });

            setNewEmail('');
            setNewPassword('');
            setNewName('');
            setNewRole('view_edit');

            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            console.error('Create user error:', err);
            toast({
                title: 'Failed to create user',
                description: err.message || 'An error occurred.',
                variant: 'destructive',
            });
        }

        setIsCreating(false);
    };

    const handleDeleteUser = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);

        try {
            // Remove the role entry (this revokes access)
            const { error } = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', deleteTarget.id);

            if (error) throw error;

            toast({
                title: 'User access revoked',
                description: `${deleteTarget.email} has been removed.`,
            });

            // Refresh the list
            await fetchUsers();
        } catch (err: any) {
            console.error('Delete user error:', err);
            toast({
                title: 'Failed to remove user',
                description: err.message || 'An error occurred.',
                variant: 'destructive',
            });
        }

        setIsDeleting(false);
        setDeleteTarget(null);
    };

    return (
        <Card className="glass-panel animate-slide-up [animation-delay:350ms]">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-base">User Management</CardTitle>
                        <CardDescription>Add and manage team members</CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Add New User Form */}
                <div className="p-4 rounded-lg border border-border/50 bg-muted/10 space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <UserPlus className="h-4 w-4 text-primary" />
                        Add New User
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Display Name</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g. John Doe"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Email (Username)</Label>
                            <Input
                                type="email"
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="e.g. john@company.com"
                                className="h-9"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs">Password</Label>
                            <Input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Min. 6 characters"
                                className="h-9"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs">Permission</Label>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant={newRole === 'view_only' ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1 gap-1.5 h-9"
                                    onClick={() => setNewRole('view_only')}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    View Only
                                </Button>
                                <Button
                                    type="button"
                                    variant={newRole === 'view_edit' ? 'default' : 'outline'}
                                    size="sm"
                                    className="flex-1 gap-1.5 h-9"
                                    onClick={() => setNewRole('view_edit')}
                                >
                                    <Pencil className="h-3.5 w-3.5" />
                                    View & Edit
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Button onClick={handleCreateUser} disabled={isCreating} className="w-full gap-2">
                        {isCreating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Creating User...
                            </>
                        ) : (
                            <>
                                <UserPlus className="h-4 w-4" />
                                Add User
                            </>
                        )}
                    </Button>
                </div>

                {/* Existing Users List */}
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                        Team Members ({users.length})
                    </h4>
                    {isLoadingUsers ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : users.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
                    ) : (
                        <div className="space-y-2">
                            {users.map((u) => (
                                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                            {(u.name || u.email)[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">{u.name || u.email}</p>
                                            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {u.isSuperAdmin && (
                                            <Badge variant="default" className="text-[10px] px-2">Admin</Badge>
                                        )}
                                        <Badge variant={u.role === 'view_edit' ? 'secondary' : 'outline'} className="text-[10px] px-2">
                                            {u.role === 'view_edit' ? 'View & Edit' : 'View Only'}
                                        </Badge>
                                        {/* Delete button — cannot delete super admin or self */}
                                        {!u.isSuperAdmin && u.id !== user?.id && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setDeleteTarget(u)}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove user access?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will revoke access for <strong>{deleteTarget?.name || deleteTarget?.email}</strong> ({deleteTarget?.email}).
                                They will no longer be able to log in.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                disabled={isDeleting}
                                onClick={handleDeleteUser}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {isDeleting ? 'Removing...' : 'Remove User'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}
