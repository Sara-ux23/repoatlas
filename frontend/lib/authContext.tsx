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
    // Load existing session on mount
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getRedirectUrl = () => {
    const envUrl = (import.meta as any).env?.VITE_SITE_URL || (import.meta as any).env?.VITE_PUBLIC_SITE_URL;
    if (envUrl) return envUrl;
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://repoatlas-opal.vercel.app';
  };

  const signInWithGitHub = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: getRedirectUrl() },
    });
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectUrl() },
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
      options: { emailRedirectTo: getRedirectUrl() },
    });
    return error?.message ?? null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.location.replace('/auth');
    }
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
