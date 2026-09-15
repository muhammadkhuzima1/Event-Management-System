import React, { useState } from 'react';
import { Mail, Lock, LogIn, Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfigNotice } from '../../components/common/ConfigNotice';
import { isSupabaseConfigured } from '../../lib/supabase';

interface LoginPageProps {
  navigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ navigate }) => {
  const { signIn } = useAuth();
  const { success, error: toastError } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please provide both your email and password.');
      return;
    }

    try {
      setIsLoading(true);
      const { error, role } = await signIn(email, password);

      if (error) {
        setErrorMessage(error);
        toastError(error);
        return;
      }

      success('Signed in successfully.');
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/events');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed. Please check your credentials.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 space-y-6">
      {!isSupabaseConfigured && <ConfigNotice />}

      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Attendee Sign In</h1>
        <p className="text-sm text-slate-400">
          Sign in to your attendee account to view workshops, book tickets, and manage registrations.
        </p>
      </div>

      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-md">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-login-email"
                type="email"
                required
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-login-password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <button
            id="btn-submit-signin"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In as Attendee</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-3 text-center text-xs text-slate-400">
          <div>
            <span>Don't have an account yet? </span>
            <button
              id="btn-goto-signup"
              onClick={() => navigate('/signup')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
            >
              Attendee Sign Up
            </button>
          </div>
          <div>
            <span>Are you an administrator? </span>
            <button
              id="btn-goto-admin-login"
              onClick={() => navigate('/admin/login')}
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
            >
              Admin Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
