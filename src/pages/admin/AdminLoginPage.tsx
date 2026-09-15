import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  LogIn, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle2, 
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfigNotice } from '../../components/common/ConfigNotice';

interface AdminLoginPageProps {
  navigate: (path: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ navigate }) => {
  const { adminSignIn, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your administrator email.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your administrator password.');
      return;
    }

    try {
      setIsSubmitting(true);

      /**
       * Strictly follow user instructions:
       * 1. Authenticate using Supabase Auth (signInWithPassword).
       * 2. Get the logged-in user's ID.
       * 3. Load that user's profile from public.profiles.
       * 4. Check the role column.
       * 5. If role is admin, allow access to the Admin Dashboard.
       * 6. If role is attendee, do NOT allow access to the Admin Dashboard.
       * 7. Show a friendly "Access denied" message for attendees.
       * 8. Never determine admin access from frontend-only variables or localStorage.
       */

      // 1. Authenticate using Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError || !authData.user) {
        const errorMsg = authError?.message || 'Invalid email or password. Please verify credentials.';
        setErrorMessage(errorMsg);
        toastError(errorMsg);
        return;
      }

      // 2. Get the logged-in user's ID
      const loggedInUserId = authData.user.id;

      // 3. Load that user's profile from public.profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at, updated_at')
        .eq('id', loggedInUserId)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        const msg = `Unable to verify permissions from database: ${profileError.message}`;
        setErrorMessage(msg);
        toastError(msg);
        return;
      }

      if (!profile) {
        await supabase.auth.signOut();
        const msg = 'Access denied. Admin account required.';
        setErrorMessage(msg);
        toastError(msg);
        return;
      }

      // 4. Check the role column
      if (profile.role !== 'admin') {
        // If role is attendee, do NOT allow access to the Admin Dashboard.
        // Show a friendly "Access denied. Admin account required." message.
        await supabase.auth.signOut();
        const deniedMsg = 'Access denied. Admin account required.';
        setErrorMessage(deniedMsg);
        toastError(deniedMsg);
        return;
      }

      // 5. If role is admin, allow access to the Admin Dashboard
      await refreshProfile();
      success('Admin authenticated successfully. Welcome to the Control Center.');
      navigate('/admin');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during administrator authentication.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 space-y-6">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 mb-2 shadow-inner">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider bg-indigo-950/60 text-indigo-300 border border-indigo-800/60">
          Organizer & Staff Portal
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Admin Sign In</h1>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Secure authentication for Nowshera Events Co. administrators. Verifies authorization against the database profiles table.
        </p>
      </div>

      {/* Error / Access Denied Alert */}
      {errorMessage && (
        <div
          id="admin-login-error"
          className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in duration-200"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-rose-200 block">Authentication Notice</span>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Sign In Form Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md space-y-6">
        <form onSubmit={handleAdminSignIn} className="space-y-5">
          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Admin Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="input-admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@nowsherevents.com"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                Password
              </label>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="input-admin-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-800 rounded-2xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="btn-admin-signin"
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verifying Role in Database...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                <span>Sign In to Admin Dashboard</span>
              </>
            )}
          </button>
        </form>

        {/* Security Info Pill */}
        <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-1.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-indigo-300 font-semibold">
            <KeyRound className="w-3.5 h-3.5" />
            <span>Role-Based Security Model</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            Authorization is verified server-side against <code className="text-indigo-300 font-mono">public.profiles.role</code>. Attendees attempting admin sign in will be denied access.
          </p>
        </div>
      </div>

      {/* Attendee / Public Links */}
      <div className="space-y-3 text-center">
        <div className="text-xs text-slate-400">
          Not an administrator?{' '}
          <button
            onClick={() => navigate('/login')}
            className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-4"
          >
            Sign in as Attendee
          </button>
        </div>

        <button
          onClick={() => navigate('/events')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Workshop Catalog</span>
        </button>
      </div>
    </div>
  );
};
