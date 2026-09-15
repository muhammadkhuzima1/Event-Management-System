import React, { useState, useEffect, useTransition } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { MyRegistrationsPage } from './pages/MyRegistrationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminEventsPage } from './pages/admin/AdminEventsPage';
import { AdminEventDetailPage } from './pages/admin/AdminEventDetailPage';
import { AdminAttendeesPage } from './pages/admin/AdminAttendeesPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { LoadingSpinner } from './components/common/LoadingSpinner';

function AppContent() {
  const { user, isAdmin, isLoading: isAuthLoading } = useAuth();
  const { error: showErrorToast } = useToast();
  const [isPending, startTransition] = useTransition();

  // Route state initialized from window.location.pathname
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Navigation function
  const navigate = (path: string) => {
    startTransition(() => {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  // Sync with browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Parse path & route access control
  useEffect(() => {
    if (isAuthLoading) return;

    // Check protected attendee routes
    const isAttendeeProtectedRoute =
      currentPath.startsWith('/my-registrations') || currentPath.startsWith('/profile');

    if (isAttendeeProtectedRoute && !user) {
      navigate('/login');
      return;
    }

    // Check protected admin routes (excluding the admin login page itself)
    const isAdminRoute = currentPath.startsWith('/admin') && currentPath !== '/admin/login';

    if (isAdminRoute) {
      if (!user) {
        navigate('/admin/login');
        return;
      }
      if (!isAdmin) {
        showErrorToast('Access denied: Administrator privileges required.');
        navigate('/events');
        return;
      }
    }
  }, [currentPath, user, isAdmin, isAuthLoading]);

  // Render current view
  const renderRoute = () => {
    if (isAuthLoading) {
      return <LoadingSpinner label="Authenticating session..." fullPage />;
    }

    // Home
    if (currentPath === '/' || currentPath === '') {
      return <HomePage navigate={navigate} />;
    }

    // Auth
    if (currentPath === '/login') {
      return <LoginPage navigate={navigate} />;
    }
    if (currentPath === '/signup/admin') {
      navigate('/admin/login');
      return <AdminLoginPage navigate={navigate} />;
    }
    if (currentPath === '/signup') {
      return <SignupPage navigate={navigate} />;
    }
    if (currentPath === '/admin/login') {
      return <AdminLoginPage navigate={navigate} />;
    }

    // Public / Attendee Event Routes
    if (currentPath === '/events') {
      return <EventsPage navigate={navigate} />;
    }

    // /events/:id
    const eventDetailMatch = currentPath.match(/^\/events\/([a-zA-Z0-9_-]+)$/);
    if (eventDetailMatch) {
      return <EventDetailPage eventId={eventDetailMatch[1]} navigate={navigate} />;
    }

    // Authenticated Attendee
    if (currentPath === '/my-registrations') {
      return <MyRegistrationsPage navigate={navigate} />;
    }
    if (currentPath === '/profile') {
      return <ProfilePage navigate={navigate} />;
    }

    // Admin Routes
    if (currentPath === '/admin') {
      return <AdminDashboardPage navigate={navigate} />;
    }
    if (currentPath === '/admin/events' || currentPath === '/admin/events/new') {
      const urlParams = new URLSearchParams(window.location.search);
      const action = currentPath === '/admin/events/new' ? 'new' : urlParams.get('action');
      return <AdminEventsPage navigate={navigate} initialAction={action} />;
    }
    if (currentPath === '/admin/reports') {
      return <AdminReportsPage navigate={navigate} />;
    }

    // /admin/events/:id/attendees
    const adminAttendeesMatch = currentPath.match(/^\/admin\/events\/([a-zA-Z0-9_-]+)\/attendees$/);
    if (adminAttendeesMatch) {
      return <AdminAttendeesPage eventId={adminAttendeesMatch[1]} navigate={navigate} />;
    }

    // /admin/events/:id
    const adminEventDetailMatch = currentPath.match(/^\/admin\/events\/([a-zA-Z0-9_-]+)$/);
    if (adminEventDetailMatch) {
      return <AdminEventDetailPage eventId={adminEventDetailMatch[1]} navigate={navigate} />;
    }

    // Fallback: 404
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <h2 className="text-3xl font-black text-white">Page Not Found</h2>
        <p className="text-slate-400 text-sm max-w-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <button
          onClick={() => navigate('/events')}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
        >
          Return to Events
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      <Navbar currentPath={currentPath} navigate={navigate} />
      <main className="flex-1">{renderRoute()}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
