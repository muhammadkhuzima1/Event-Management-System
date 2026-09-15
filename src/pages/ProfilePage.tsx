import React from 'react';
import { User, Mail, Shield, Calendar, Sparkles, CheckCircle2, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ConfigNotice } from '../components/common/ConfigNotice';
import { isSupabaseConfigured } from '../lib/supabase';

interface ProfilePageProps {
  navigate: (path: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ navigate }) => {
  const { user, profile, role, isAdmin } = useAuth();

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Header */}
      <div className="pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Account Overview</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">User Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Your personal account details stored securely in the Nowshera Events database.
        </p>
      </div>

      {/* Profile Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 pb-8 border-b border-slate-800/80">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black text-3xl shadow-xl shadow-emerald-500/20">
            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-white">{profile?.full_name || 'Attendee'}</h2>
            <p className="text-sm text-slate-400 font-mono">{user?.email || profile?.email}</p>
            <div className="pt-2 flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium tracking-wide uppercase inline-flex items-center gap-1.5 ${
                  isAdmin
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Role: {role || 'attendee'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Details List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Full Name</span>
            </span>
            <p className="font-semibold text-white text-base">{profile?.full_name || 'Not provided'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              <span>Email Address</span>
            </span>
            <p className="font-semibold text-white text-base truncate">{user?.email || profile?.email || 'N/A'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>Assigned Security Role</span>
            </span>
            <p className="font-semibold text-white text-base capitalize">
              {role || 'attendee'}
            </p>
            <p className="text-[11px] text-slate-500">
              Role permissions are enforced strictly by PostgreSQL Row Level Security (RLS).
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              <span>Member Since</span>
            </span>
            <p className="font-semibold text-white text-base">
              {formatDate(profile?.created_at || user?.created_at)}
            </p>
          </div>
        </div>

        {/* Quick Navigation based on role */}
        <div className="pt-6 border-t border-slate-800/80 flex flex-wrap gap-4">
          {!isAdmin ? (
            <button
              onClick={() => navigate('/my-registrations')}
              className="px-5 py-2.5 rounded-xl font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors flex items-center gap-2"
            >
              <Ticket className="w-4 h-4 text-emerald-400" />
              <span>View My Registrations</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/admin')}
              className="px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-500 text-white text-sm transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
            >
              <Shield className="w-4 h-4" />
              <span>Open Admin Dashboard</span>
            </button>
          )}

          <button
            onClick={() => navigate('/events')}
            className="px-5 py-2.5 rounded-xl font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-sm transition-colors"
          >
            Explore Events
          </button>
        </div>
      </div>
    </div>
  );
};
