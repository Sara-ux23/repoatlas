'use client';

/**
 * AuthContext — wraps the whole app and exposes:
 *   user          : Supabase User | null
 *   session       : Supabase Session | null  (has .access_token for API calls)
 *   loading       : boolean
 *   signInWithGitHub()
 *   signInWithGoogle()
 *   signInWithEmail(email, password)
 *   signUpWithEmail(email, password)
 *   signOut()
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithGitHub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<string | null>;
  signUpWithEmail: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 1. Subscribe to auth state changes FIRST so we capture OAuth redirect & token parsing events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('[AuthContext] onAuthStateChange event:', event, newSession?.user?.email ?? 'No user');
      if (mounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    });

    // 2. Fetch existing session from localStorage
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setLoading(false);
        } else {
          // If URL contains OAuth callback code or access_token hash, defer loading=false to onAuthStateChange
          const hasAuthParams = typeof window !== 'undefined' &&
            (window.location.search.includes('code=') || window.location.hash.includes('access_token='));
          if (!hasAuthParams) {
            setLoading(false);
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signInWithEmail = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signUpWithEmail = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace('/auth');
  };

  return (
    <AuthContext.Provider
      value={{ user, session, loading, signInWithGitHub, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
