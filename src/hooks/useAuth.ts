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
      email: 'admin@rental.com',
      name: 'Admin User',
      createdAt: new Date().toISOString(),
    }
  ]);

  const login = useCallback((email: string, password: string): boolean => {
    // Simple auth - in production this would validate against backend
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user && password === 'rental123') { // Simple password for demo
      setAuthState({
        user,
        isAuthenticated: true,
      });
      return true;
    }
    return false;
  }, [users, setAuthState]);

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
      createdAt: new Date().toISOString(),
    };
    
    setUsers(prev => [...prev, newUser]);
    setAuthState({
      user: newUser,
      isAuthenticated: true,
    });
    
    return true;
  }, [users, setUsers, setAuthState]);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    login,
    logout,
    register,
  };
}
