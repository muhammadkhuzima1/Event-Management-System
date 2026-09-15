import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  CheckCircle2, 
  Users, 
  Ticket, 
  TrendingUp, 
  Plus, 
  ArrowRight, 
  RefreshCw, 
  AlertCircle,
  FileText,
  Clock,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { supabase, isSupabaseConfigured, getActiveSupabaseClient } from '../../lib/supabase';
import { AdminStats, EventItem } from '../../types/database';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfigNotice } from '../../components/common/ConfigNotice';
import { useAuth } from '../../context/AuthContext';
import { fetchAllEvents } from '../../lib/eventsStore';

interface AdminDashboardPageProps {
  navigate: (path: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({ navigate }) => {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalEvents: 0,
    publishedEvents: 0,
    upcomingEvents: 0,
    totalRegistrations: 0,
    activeRegistrations: 0,
    totalCapacity: 0,
    remainingCapacity: 0,
  });
  const [recentEvents, setRecentEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const allEvents = await fetchAllEvents();

      let dbRegs: any[] = [];
      if (isSupabaseConfigured) {
        try {
          const client = await getActiveSupabaseClient();
          const { data } = await client.from('registrations').select('id, event_id, status');
          if (data) dbRegs = data;
        } catch {
          // Ignore
        }
      }

      // Compute total registered and active counts directly from live events
      const totalCapacity = allEvents.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0);
      const activeRegsCount = allEvents.reduce((acc, curr) => acc + (Number(curr.active_registrations_count) || 0), 0);
      const remainingCapacity = allEvents.reduce((acc, curr) => acc + (Number(curr.available_places) || 0), 0);

      // Total historical registrations including cancelled
      const cancelledCount = dbRegs.filter((r) => r.status === 'cancelled').length;
      const totalRegsCount = activeRegsCount + cancelledCount;

      const totalEvents = allEvents.length;
      const publishedEvents = allEvents.filter((e) => e.status === 'published').length;

      const todayStr = new Date().toISOString().split('T')[0];
      const upcomingEvents = allEvents.filter(
        (e) => e.status === 'published' && (!e.event_date || e.event_date >= todayStr)
      ).length;

      setStats({
        totalEvents,
        publishedEvents,
        upcomingEvents,
        totalRegistrations: totalRegsCount,
        activeRegistrations: activeRegsCount,
        totalCapacity,
        remainingCapacity,
      });

      setRecentEvents(allEvents.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator Control Center</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Overview & Analytics</h1>
          <p className="mt-1 text-sm text-slate-400">
            Monitor workshop schedules, active registrations, capacity limits, and attendee attendance in Nowshera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-dashboard-new-event"
            onClick={() => navigate('/admin/events/new')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading admin metrics..." />
      ) : (
        <>
          {/* Key Metrics Bento Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Stat 1: Total Events */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-mono uppercase tracking-wider">Total Events</span>
                <div className="p-2 rounded-xl bg-slate-800/80 text-indigo-400">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{stats.totalEvents}</div>
              <p className="text-[11px] text-slate-400">
                <span className="text-emerald-400 font-semibold">{stats.publishedEvents}</span> published & live
              </p>
            </div>

            {/* Stat 2: Active Registrations */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-mono uppercase tracking-wider">Active Registrations</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Ticket className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{stats.activeRegistrations}</div>
              <p className="text-[11px] text-slate-400">
                Total seats reserved across workshops
              </p>
            </div>

            {/* Stat 3: Total Capacity */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-mono uppercase tracking-wider">Total Seat Capacity</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{stats.totalCapacity}</div>
              <p className="text-[11px] text-slate-400">
                <span className="text-cyan-400 font-semibold">{stats.remainingCapacity}</span> seats currently available
              </p>
            </div>

            {/* Stat 4: Upcoming Sessions */}
            <div className="bg-slate-900/70 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-mono uppercase tracking-wider">Upcoming Sessions</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-black text-white">{stats.upcomingEvents}</div>
              <p className="text-[11px] text-slate-400">
                Scheduled in Nowshera
              </p>
            </div>
          </div>

          {/* Recent Events Table / List */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Active Events</h2>
                <p className="text-xs text-slate-400 mt-0.5">Quick access to attendee rosters and capacity allocation</p>
              </div>
              <button
                onClick={() => navigate('/admin/events')}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                <span>View All Events</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-800/80">
              {recentEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/30 px-3 rounded-2xl transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {evt.status}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {formatDate(evt.event_date)}
                      </span>
                    </div>
                    <h3
                      onClick={() => navigate(`/events/${evt.id}`)}
                      className="text-sm font-bold text-white hover:text-indigo-400 cursor-pointer transition-colors"
                    >
                      {evt.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate max-w-md">{evt.location}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-white">
                        {evt.active_registrations_count} / {evt.capacity} booked
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {evt.available_places} seats remaining
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/admin/events/${evt.id}/attendees`)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                    >
                      Attendees
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
