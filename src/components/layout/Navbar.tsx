import React, { useState } from 'react';
import { 
  Calendar, 
  Ticket, 
  User as UserIcon, 
  LogOut, 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  FileText, 
  Menu, 
  X, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentPath: string;
  navigate: (path: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPath, navigate }) => {
  const { user, profile, isAdmin, signOut } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleNav = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    setIsMobileMenuOpen(false);
  };

  const isActive = (path: string) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <button
          id="nav-brand-logo"
          onClick={() => handleNav('/')}
          className="flex items-center gap-3 text-left group transition-transform focus:outline-none"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block leading-tight group-hover:text-emerald-400 transition-colors">
              Nowshera Events Co.
            </span>
            <span className="text-[11px] text-slate-400 font-mono tracking-wider uppercase block">
              Workshops & Seminars
            </span>
          </div>
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {/* Public / Common Links */}
          <button
            id="nav-link-explore"
            onClick={() => handleNav('/events')}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/events') && !currentPath.startsWith('/admin')
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900'
            }`}
          >
            Events
          </button>

          {/* Attendee Navigation */}
          {user && !isAdmin && (
            <button
              id="nav-link-my-registrations"
              onClick={() => handleNav('/my-registrations')}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                isActive('/my-registrations')
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Ticket className="w-4 h-4" />
              <span>My Registrations</span>
            </button>
          )}

          {/* Admin Navigation */}
          {user && isAdmin && (
            <>
              <button
                id="nav-link-admin-dashboard"
                onClick={() => handleNav('/admin')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                  currentPath === '/admin'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard</span>
              </button>
              <button
                id="nav-link-admin-events"
                onClick={() => handleNav('/admin/events')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                  currentPath.startsWith('/admin/events')
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <CalendarDays className="w-4 h-4" />
                <span>Manage Events</span>
              </button>
              <button
                id="nav-link-admin-reports"
                onClick={() => handleNav('/admin/reports')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-all ${
                  currentPath === '/admin/reports'
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Reports</span>
              </button>
            </>
          )}

          {/* Logged in Profile & Role */}
          {user ? (
            <div className="flex items-center gap-2 ml-3 pl-3 border-l border-slate-800">
              <button
                id="nav-link-profile"
                onClick={() => handleNav('/profile')}
                className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  isActive('/profile')
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-900'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-300">
                  {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : <UserIcon className="w-3.5 h-3.5" />}
                </div>
                <span className="max-w-[120px] truncate">{profile?.full_name || 'Profile'}</span>
                {isAdmin ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Admin
                  </span>
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                    Attendee
                  </span>
                )}
              </button>

              <button
                id="nav-btn-signout"
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-3">
              <button
                id="nav-btn-admin-signin"
                onClick={() => handleNav('/admin/login')}
                className="px-3 py-2 rounded-xl text-xs font-mono font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Admin Sign In"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Admin Sign In</span>
              </button>
              <button
                id="nav-btn-attendee-signin"
                onClick={() => handleNav('/login')}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Attendee Sign In
              </button>
              <button
                id="nav-btn-attendee-signup"
                onClick={() => handleNav('/signup')}
                className="px-3.5 py-2 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                Attendee Sign Up
              </button>
            </div>
          )}
        </nav>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {user && isAdmin && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
              Admin
            </span>
          )}
          <button
            id="nav-mobile-menu-toggle"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950/95 px-4 pt-3 pb-6 space-y-2 animate-in slide-in-from-top duration-200">
          <button
            id="mobile-nav-events"
            onClick={() => handleNav('/events')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
              isActive('/events') && !currentPath.startsWith('/admin')
                ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                : 'text-slate-300 hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span>Discover Events</span>
          </button>

          {user && !isAdmin && (
            <button
              id="mobile-nav-my-registrations"
              onClick={() => handleNav('/my-registrations')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                isActive('/my-registrations')
                  ? 'bg-emerald-500/15 text-emerald-400 font-semibold'
                  : 'text-slate-300 hover:bg-slate-900'
              }`}
            >
              <Ticket className="w-4 h-4 text-emerald-400" />
              <span>My Registrations</span>
            </button>
          )}

          {user && isAdmin && (
            <div className="pt-2 border-t border-slate-800/80 mt-2 space-y-1">
              <div className="px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
                Admin Center
              </div>
              <button
                id="mobile-nav-admin-dashboard"
                onClick={() => handleNav('/admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                  currentPath === '/admin' ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-indigo-400" />
                <span>Dashboard</span>
              </button>
              <button
                id="mobile-nav-admin-events"
                onClick={() => handleNav('/admin/events')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                  currentPath.startsWith('/admin/events')
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <CalendarDays className="w-4 h-4 text-indigo-400" />
                <span>Manage Events</span>
              </button>
              <button
                id="mobile-nav-admin-reports"
                onClick={() => handleNav('/admin/reports')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left ${
                  currentPath === '/admin/reports'
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Reports & Analytics</span>
              </button>
            </div>
          )}

          {user ? (
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <button
                id="mobile-nav-profile"
                onClick={() => handleNav('/profile')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive('/profile') ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-slate-400" />
                  <span>{profile?.full_name || 'My Profile'}</span>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {isAdmin ? 'Admin' : 'Attendee'}
                </span>
              </button>

              <button
                id="mobile-nav-signout"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                id="mobile-nav-admin-signin"
                onClick={() => handleNav('/admin/login')}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-indigo-300 bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-700/40 text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Admin Sign In</span>
              </button>
              <button
                id="mobile-nav-attendee-signin"
                onClick={() => handleNav('/login')}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 text-center cursor-pointer"
              >
                Attendee Sign In
              </button>
              <button
                id="mobile-nav-attendee-signup"
                onClick={() => handleNav('/signup')}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-center shadow-md cursor-pointer"
              >
                Attendee Sign Up
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
