import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Profile, UserRole } from '../types/database';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;
  refreshProfile: () => Promise<Profile | null>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; role: UserRole | null }>;
  adminSignIn: (email: string, password: string) => Promise<{ error: string | null; role: UserRole | null }>;
  signUp: (
    fullName: string,
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch profile strictly from public.profiles in database
  const fetchProfile = async (userId: string, retries = 2): Promise<Profile | null> => {
    try {
      if (!isSupabaseConfigured) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Profile fetch notice from DB:', error.message);
      }

      if (!data && retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return fetchProfile(userId, retries - 1);
      }

      if (data) {
        // Enforce role strictly from the database column
        const dbRole: UserRole = data.role === 'admin' ? 'admin' : 'attendee';

        const loadedProfile: Profile = {
          id: data.id,
          full_name: data.full_name || '',
          email: data.email || '',
          role: dbRole,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        setProfile(loadedProfile);
        return loadedProfile;
      }

      setProfile(null);
      return null;
    } catch (err) {
      console.error('Unexpected error loading profile from public.profiles:', err);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('Auth getSession notice:', error.message);
          }
          if (isMounted && data?.session?.user) {
            setSession(data.session);
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
            setIsLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    let authSubscription: { unsubscribe: () => void } | null = null;

    if (isSupabaseConfigured) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          await fetchProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setIsLoading(false);
      });
      authSubscription = authListener.subscription;
    }

    return () => {
      isMounted = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  const refreshProfile = async (): Promise<Profile | null> => {
    if (!user) return null;
    return await fetchProfile(user.id);
  };

  /**
   * Secure Admin Sign In
   * 1. Authenticate using Supabase Auth (signInWithPassword)
   * 2. Get the logged-in user's ID
   * 3. Load that user's profile from public.profiles
   * 4. Check the role column
   * 5. If role is admin, allow access to Admin Dashboard
   * 6. If role is attendee, do NOT allow access to Admin Dashboard
   * 7. Show a friendly "Access denied" message for attendees
   * 8. Never determine admin access from frontend-only variables or localStorage
   */
  const adminSignIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null; role: UserRole | null }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      return { error: 'Database service is currently initializing. Please check configuration.', role: null };
    }

    try {
      // 1. Authenticate using Supabase Auth
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError || !data.user) {
        return {
          error: authError?.message || 'Invalid credentials. Please verify your email and password.',
          role: null,
        };
      }

      // 2. Get the logged-in user's ID
      const userId = data.user.id;

      // 3. Load that user's profile from public.profiles
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        return {
          error: `Unable to verify permissions: ${profileError.message}`,
          role: null,
        };
      }

      if (!profileData) {
        await supabase.auth.signOut();
        return {
          error: 'Access denied. Admin account required.',
          role: null,
        };
      }

      // 4. Check the role column
      if (profileData.role !== 'admin') {
        // If role is attendee, do NOT allow access to the Admin Dashboard
        // Show a friendly "Access denied. Admin account required." message for attendees
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        return {
          error: 'Access denied. Admin account required.',
          role: 'attendee',
        };
      }

      // 5. If role is admin, allow access to Admin Dashboard
      const verifiedProfile: Profile = {
        id: profileData.id,
        full_name: profileData.full_name || '',
        email: profileData.email || '',
        role: 'admin',
        created_at: profileData.created_at,
        updated_at: profileData.updated_at,
      };

      setUser(data.user);
      setSession(data.session);
      setProfile(verifiedProfile);

      return { error: null, role: 'admin' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication process failed.';
      return { error: msg, role: null };
    }
  };

  /**
   * Standard Attendee Sign In
   */
  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: string | null; role: UserRole | null }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (!isSupabaseConfigured) {
      return { error: 'Database service is currently initializing. Please check configuration.', role: null };
    }

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError || !data.user) {
        return {
          error: authError?.message || 'Invalid login credentials. Please check your email and password.',
          role: null,
        };
      }

      setUser(data.user);
      setSession(data.session);

      const p = await fetchProfile(data.user.id);
      const userRole: UserRole = p?.role === 'admin' ? 'admin' : 'attendee';

      return { error: null, role: userRole };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.';
      return { error: msg, role: null };
    }
  };

  /**
   * Attendee Sign Up only
   * All new public signups automatically become role = 'attendee'
   * No public admin signup is allowed.
   */
  const signUp = async (
    fullName: string,
    email: string,
    password: string
  ): Promise<{ error: string | null }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    if (!isSupabaseConfigured) {
      return { error: 'Database connection required for account registration.' };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            role: 'attendee',
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data?.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id, 2);
        return { error: null };
      }

      return { error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed.';
      return { error: msg };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  // Source of truth: only true if database profile role column is strictly 'admin'
  const isAdmin = profile !== null && profile.role === 'admin';
  const currentRole: UserRole = isAdmin ? 'admin' : 'attendee';

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role: currentRole,
        isAdmin,
        isLoading,
        isConfigured: isSupabaseConfigured,
        refreshProfile,
        signIn,
        adminSignIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
