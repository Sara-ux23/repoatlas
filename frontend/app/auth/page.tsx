'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Github, Mail, Lock, Eye, EyeOff, Sparkles,
  ArrowRight, AlertCircle, CheckCircle, X,
} from 'lucide-react';
import { useAuth } from '../../lib/authContext';
import { Navbar } from '../../components/Navbar';
import { Hero } from '../../components/Hero';
import { PipelineFlow } from '../../components/PipelineFlow';
import { TechStack } from '../../components/TechStack';
import { Stats } from '../../components/Stats';
import { FinalCTA } from '../../components/FinalCTA';
import { SocialProof } from '../../components/SocialProof';
import { Footer } from '../../components/Footer';

type Mode = 'signin' | 'signup';

/* ─── Sign-in modal ─────────────────────────────────────────────────── */
function SignInModal({ onClose }: { onClose: () => void }) {
  const { signInWithGitHub, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setSubmitting(true);
    const err = mode === 'signin'
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password);
    setSubmitting(false);
    if (err) {
      setError(err);
    } else if (mode === 'signup') {
      setSuccess('Account created! Check your email to confirm your address.');
    } else {
      history.pushState(null, '', '/agents/explorer-agent');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#111114]/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        className="relative w-full max-w-md bg-white rounded-2xl border border-[#E5E5E7] shadow-2xl p-8 space-y-6"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F3F4F6] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center space-y-1 pr-6">
          <h2 className="text-2xl font-bold text-[#111114]">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-[#6B7280]">
            {mode === 'signin'
              ? 'Sign in to continue to RepoAtlas AI'
              : 'Start exploring your repositories with AI'}
          </p>
        </div>

        {/* OAuth */}
        <div className="space-y-3">
          <button
            onClick={signInWithGitHub}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#E5E5E7] bg-white hover:bg-[#F4F6FA] text-[#111114] font-medium text-sm transition-colors"
          >
            <Github className="w-4 h-4" />
            Continue with GitHub
          </button>
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-[#E5E5E7] bg-white hover:bg-[#F4F6FA] text-[#111114] font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.77c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E5E5E7]" />
          <span className="text-xs text-[#9CA3AF] font-mono">or with email</span>
          <div className="flex-1 h-px bg-[#E5E5E7]" />
        </div>

        {/* Email form */}
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#374151]">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="email" value={email}
                onChange={e => { setEmail(e.target.value); setError(null); }}
                required placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E5E7] bg-[#FAFAFA] text-sm text-[#111114] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#374151]">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type={showPassword ? 'text' : 'password'} value={password}
                onChange={e => { setPassword(e.target.value); setError(null); }}
                required minLength={6} placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[#E5E5E7] bg-[#FAFAFA] text-sm text-[#111114] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/30 transition"
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />{success}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit" disabled={submitting}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2563EB] text-white font-semibold text-sm hover:bg-[#1D4ED8] disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {submitting
              ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Sparkles className="w-4 h-4" />{mode === 'signin' ? 'Sign In' : 'Create Account'}<ArrowRight className="w-4 h-4" /></>
            }
          </motion.button>
        </form>

        {/* Mode toggle */}
        <p className="text-center text-sm text-[#6B7280]">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null); }}
            className="text-[#2563EB] font-semibold hover:underline"
          >
            {mode === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </motion.div>
  );
}

/* ─── Auth Page — full product page + sign-in modal ────────────────── */
export default function AuthPage() {
  const { user, loading } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // Navigate to home repo loading page if already signed in (SPA — no reload)
  useEffect(() => {
    if (!loading && user) {
      history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [user, loading]);

  // Open modal if URL has ?signin=1 (Navbar "Sign In" link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signin') === '1') setModalOpen(true);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#111114] selection:bg-[#2563EB]/20 selection:text-[#2563EB] overflow-x-hidden">
      {/* Full product page — Navbar shows Product, How it Works, Technologies, Docs */}
      <Navbar hideAgents hideAuthButtons isLandingPage />
      <Hero onAnalyze={() => {}} onSignInClick={() => setModalOpen(true)} hideRepoInput />
      <PipelineFlow />
      <TechStack />
      <Stats />
      <FinalCTA onSignInClick={() => setModalOpen(true)} />
      <SocialProof />
      <Footer />

      {/* Sign-in modal overlay */}
      <AnimatePresence>
        {modalOpen && <SignInModal onClose={() => setModalOpen(false)} />}
      </AnimatePresence>
    </main>
  );
}
