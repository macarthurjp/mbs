import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
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
        const { data: { session }, error } = await supabase.auth.getSession();

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
          const profileLoaded = await loadUserProfile(session.user.id);
          if (!profileLoaded) {
            console.warn('Profile not found, signing out...');
            await supabase.auth.signOut();
            setUser(null);
            setUserProfile(null);
          }
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
      data: { subscription },
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
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading user profile:', error);
        return false;
      }

      if (!data) {
        console.error('No profile found for user');
        return false;
      }

      setUserProfile(data);
      return true;
    } catch (err) {
      console.error('Exception loading user profile:', err);
      return false;
    }
  };

  const signIn = async (username: string, password: string) => {
    try {
      // Get email from username
      const { data: emailData, error: emailError } = await supabase
        .rpc('get_email_from_username', { p_username: username });

      if (emailError) {
        console.error('Error getting email:', emailError);
        throw new Error('Error al buscar usuario');
      }

      if (!emailData) {
        throw new Error('Usuario no encontrado');
      }

      // Sign in with email and password
      const { error } = await supabase.auth.signInWithPassword({
        email: emailData,
        password
      });

      if (error) {
        console.error('Auth error:', error);
        throw new Error('Credenciales inválidas');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserProfile(null);
  };

  const isAdmin = () => userProfile?.role === 'admin';
  const isSeller = () => userProfile?.role === 'seller';

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      signIn,
      signOut,
      isAdmin,
      isSeller
    }}>
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
