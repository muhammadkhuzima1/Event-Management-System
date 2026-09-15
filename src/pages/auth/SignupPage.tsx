import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User, 
  UserPlus, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ConfigNotice } from '../../components/common/ConfigNotice';
import { isSupabaseConfigured } from '../../lib/supabase';

interface SignupPageProps {
  navigate: (path: string) => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({ navigate }) => {
  const { signUp } = useAuth();
  const { success, error: toastError } = useToast();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await signUp(fullName, email, password);

      if (res.error) {
        setErrorMessage(res.error);
        toastError(res.error);
        return;
      }

      success('Attendee account created successfully! Welcome to Nowshera Events Co.');
      navigate('/events');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Signup failed. Please try again.';
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-12 space-y-6">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl border mb-2 bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Create Attendee Account
        </h1>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Join technical workshops, software bootcamps, and developer conferences across Nowshera.
        </p>
      </div>

      {/* Main Form Box */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-200 text-xs flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-signup-name"
                type="text"
                required
                placeholder="Attendee Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-signup-email"
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
                id="input-signup-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Attendee Info Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Immediate Attendee Access</span>
            </div>
            <p className="leading-relaxed">
              Attendee accounts can instantly register for workshops, reserve seats, and view admission tickets in My Registrations.
            </p>
          </div>

          <button
            id="btn-submit-signup"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4 shadow-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer"
          >
            {isLoading ? (
              <span>Creating account...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Attendee Account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-2 text-center text-xs text-slate-400">
          <div>
            <span>Already have an account? </span>
            <button
              id="btn-goto-signin"
              onClick={() => navigate('/login')}
              className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2 ml-1 cursor-pointer"
            >
              Sign In as Attendee
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
