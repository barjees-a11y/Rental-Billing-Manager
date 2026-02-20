import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { User } from '@/types/contracts';

const AUTH_KEY = 'rental_billing_auth';
const USERS_KEY = 'rental_billing_users';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useLocalStorage<AuthState>(AUTH_KEY, {
    user: null,
    isAuthenticated: false,
  });

  const [users, setUsers] = useLocalStorage<User[]>(USERS_KEY, [
    // Default admin user
    {
      id: 'admin-1',
      email: 'barjees@saharaedoc',
      name: 'Admin User',
      password: 'rental123', // Default password
      createdAt: new Date().toISOString(),
    }
  ]);

  const login = useCallback((email: string, password: string, remember: boolean = true): boolean => {
    // Fail-safe for default admin login
    if (email.toLowerCase() === 'barjees@saharaedoc.com' && password === 'rental123') {
      const existingAdmin = users.find(u => u.email.toLowerCase() === 'barjees@saharaedoc.com');

      let adminUser = existingAdmin;
      if (!adminUser) {
        // Re-create admin if missing
        adminUser = {
          id: 'admin-1',
          email: 'barjees@saharaedoc.com',
          name: 'Admin User',
          password: 'rental123',
          createdAt: new Date().toISOString(),
        };
        setUsers(prev => [...prev, adminUser!]);
      }

      setAuthState({
        user: adminUser!,
        isAuthenticated: true,
      });
      return true;
    }

    // Simple auth - in production this would validate against backend
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    // Check against stored password or default if not set (for backward compatibility)
    const storedPassword = user?.password || 'rental123';

    if (user && password === storedPassword) {
      setAuthState({
        user,
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  }, [users, setAuthState, setUsers]);

  const logout = useCallback(() => {
    setAuthState({
      user: null,
      isAuthenticated: false,
    });
  }, [setAuthState]);

  const register = useCallback((email: string, name: string, password: string): boolean => {
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return false; // User already exists
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      email,
      name,
      password, // Store with password
      createdAt: new Date().toISOString(),
    };

    setUsers(prev => [...prev, newUser]);
    setAuthState({
      user: newUser,
      isAuthenticated: true,
    });

    return true;
  }, [users, setUsers, setAuthState]);

  const resetPassword = useCallback((email: string, newPassword: string): boolean => {
    const userIndex = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());

    if (userIndex === -1) {
      // Special handling for default admin if missing
      if (email.toLowerCase() === 'barjees@saharaedoc.com') {
        const newAdmin: User = {
          id: 'admin-1',
          email: 'barjees@saharaedoc.com',
          name: 'Admin User',
          password: newPassword,
          createdAt: new Date().toISOString(),
        };
        setUsers(prev => [...prev, newAdmin]);
        return true;
      }
      return false; // User not found
    }

    const updatedUsers = [...users];
    updatedUsers[userIndex] = {
      ...updatedUsers[userIndex],
      password: newPassword
    };

    setUsers(updatedUsers);
    return true;
  }, [users, setUsers]);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    login,
    logout,
    register,
    resetPassword,
  };
}
