import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { User as AuthUser } from '@supabase/supabase-js';

// Re-map the Supabase AuthUser to our internal User type to minimize refactoring in other files
export interface AppUser {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Handle mapping from Supabase User to App User
  const mapUser = (supabaseUser: AuthUser | null): AppUser | null => {
    if (!supabaseUser || !supabaseUser.email) return null;
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      name: supabaseUser.user_metadata?.name || supabaseUser.email.split('@')[0],
    };
  };

  useEffect(() => {
    // 1. Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        setAuthState({
          user: mapUser(session?.user || null),
          isAuthenticated: !!session?.user,
          isLoading: false,
        });
      } catch (error) {
        console.error("Error getting initial session:", error);
        setAuthState({ user: null, isAuthenticated: false, isLoading: false });
      }
    };

    getInitialSession();

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthState({
          user: mapUser(session?.user || null),
          isAuthenticated: !!session?.user,
          isLoading: false,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Login Error:", error);
      return { success: false, error: error.message };
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Logout Error:", error);
    }
  }, []);

  const register = useCallback(async (email: string, name: string, password: string): Promise<{ success: boolean, error?: string }> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          }
        }
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Registration Error:", error);
      return { success: false, error: error.message };
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ success: boolean, error?: string }> => {
    try {
      // In a real flow, this sends an email that links back to a reset page.
      // We are dropping the `newPassword` second argument as Supabase requires
      // the user to click the email link first before they can type a new password.
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Reset Password Error:", error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    user: authState.user,
    isAuthenticated: authState.isAuthenticated,
    isAuthLoading: authState.isLoading,
    login,
    logout,
    register,
    resetPassword,
  };
}
