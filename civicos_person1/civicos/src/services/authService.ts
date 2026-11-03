import { supabase } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export type UserRole = 'citizen' | 'officer' | 'staff' | 'admin';

export interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isAuthenticated: boolean;
}

export const authService = {
  /**
   * Retrieves the current Supabase session
   */
  async getSession(): Promise<Session | null> {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('[AuthService] Error fetching session:', error.message);
        return null;
      }
      return data.session;
    } catch {
      return null;
    }
  },

  /**
   * Retrieves the current JWT access token for API authorization
   */
  async getAuthToken(): Promise<string | null> {
    const session = await this.getSession();
    return session?.access_token || null;
  },

  /**
   * Retrieves the current logged-in user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) return null;
      return data.user;
    } catch {
      return null;
    }
  },

  /**
   * Resolves the user's role from their profile or user metadata
   */
  async getUserRole(userId: string): Promise<UserRole> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();

      if (!error && data?.role) {
        return data.role as UserRole;
      }
    } catch (err) {
      console.warn('[AuthService] Could not fetch profile role, using default:', err);
    }
    return 'citizen';
  },

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign up a new user with metadata
   */
  async signUp(email: string, password: string, fullName: string, role: UserRole = 'citizen') {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  /**
   * Sign out current user
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  /**
   * Listen to authentication state changes
   */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export default authService;
