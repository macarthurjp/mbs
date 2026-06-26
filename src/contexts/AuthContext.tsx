/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type UserProfile = {
  id: string;
  negocio_id: string | null;
  rol: string | null;
  role?: string | null;
  email?: string | null;
  name?: string | null;
  nombre?: string | null;
  username?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  is_active?: boolean | null;
  created_at?: string | null;
};

const USER_PROFILE_BASE_COLUMNS = 'id, negocio_id, rol, email, username, full_name, created_at';
const USER_PROFILE_FULL_COLUMNS = 'id, negocio_id, rol, email, username, full_name, is_active, created_at';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<boolean>;
  refreshProfile: () => Promise<boolean>;
  isAdmin: () => boolean;
  isSeller: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Init auth error:', err);
        setUser(null);
        setUserProfile(null);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        if (!mounted) return;

        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
          setUserProfile(null);
        }

        setLoading(false);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const baseResult = await supabase
        .from('usuarios')
        .select(USER_PROFILE_BASE_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      if (baseResult.error) {
        console.error('Error loading user profile:', baseResult.error);
        setUserProfile(null);
        return false;
      }

      if (!baseResult.data) {
        console.warn('No se encontró un registro en usuarios para este auth user:', userId);

        const fallbackProfile: UserProfile = {
          id: userId,
          negocio_id: null,
          rol: null,
          email: null,
          username: null,
          full_name: null,
          is_active: true,
          created_at: null
        };

        setUserProfile(fallbackProfile);
        return true;
      }

      let data = baseResult.data as UserProfile;
      const fullResult = await supabase
        .from('usuarios')
        .select(USER_PROFILE_FULL_COLUMNS)
        .eq('id', userId)
        .maybeSingle();

      if (!fullResult.error && fullResult.data) {
        data = fullResult.data as UserProfile;
      }

      setUserProfile({
        ...data,
        nombre: data.full_name || data.username || data.email || null,
        name: data.full_name || data.username || data.email || null,
        fullName: data.full_name || null
      });
      return true;
    } catch (err) {
      console.error('Exception loading user profile:', err);
      setUserProfile(null);
      return false;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Auth error:', error);
        throw new Error('Credenciales inválidas');
      }

      if (data.user) {
        setUser(data.user);
        await loadUserProfile(data.user.id);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    setUser(null);
    setUserProfile(null);
  };

  const refreshUserProfile = async () => {
    if (!user?.id) return false;
    return loadUserProfile(user.id);
  };
  const refreshProfile = refreshUserProfile;

  const isAdmin = () => ['super_admin', 'owner', 'admin'].includes(userProfile?.rol || '');
  const isSeller = () => userProfile?.rol === 'seller' || userProfile?.rol === 'vendedor';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        signIn,
        signOut,
        refreshUserProfile,
        refreshProfile,
        isAdmin,
        isSeller
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
