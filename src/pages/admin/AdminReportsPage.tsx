import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  Download, 
  RefreshCw, 
  BarChart3, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Users, 
  TrendingUp, 
  ShieldCheck 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { EventItem, Registration } from '../../types/database';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfigNotice } from '../../components/common/ConfigNotice';
import { useToast } from '../../context/ToastContext';

interface AdminReportsPageProps {
  navigate: (path: string) => void;
}

export const AdminReportsPage: React.FC<AdminReportsPageProps> = ({ navigate }) => {
  const { success } = useToast();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);

  const fetchReportData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [eventsRes, regsRes] = await Promise.all([
        supabase.from('events').select('*').order('event_date', { ascending: false }),
        supabase.from('registrations').select('id, user_id, event_id, status, created_at'),
      ]);

      if (eventsRes.data) setEvents(eventsRes.data);
      if (regsRes.data) setRegistrations(regsRes.data as Registration[]);
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  // Compute breakdown numbers
  const totalEvents = events.length;
  const publishedEvents = events.filter((e) => e.status === 'published').length;
  const completedEvents = events.filter((e) => e.status === 'completed').length;
  const cancelledEvents = events.filter((e) => e.status === 'cancelled').length;
  const draftEvents = events.filter((e) => e.status === 'draft').length;

  const totalRegistrations = registrations.length;
  const activeRegistrations = registrations.filter((r) => r.status === 'active').length;
  const cancelledRegistrations = registrations.filter((r) => r.status === 'cancelled').length;

  const totalCapacity = events.reduce((acc, curr) => acc + (Number(curr.capacity) || 0), 0);
  const remainingCapacity = Math.max(0, totalCapacity - activeRegistrations);
  const occupancyRate = totalCapacity > 0 ? Math.round((activeRegistrations / totalCapacity) * 100) : 0;

  // Export Events & Capacity CSV Report
  const handleExportEventsCSV = () => {
    if (events.length === 0) return;

    const headers = ['Event ID', 'Title', 'Date', 'Time', 'Location', 'Status', 'Total Capacity', 'Active Bookings'];
    
    // Map registrations count by event
    const activeMap: Record<string, number> = {};
    registrations.forEach((r) => {
      if (r.status === 'active') {
        activeMap[r.event_id] = (activeMap[r.event_id] || 0) + 1;
      }
    });

    const rows = events.map((e) => [
      e.id,
      `"${e.title.replace(/"/g, '""')}"`,
      e.event_date,
      e.event_time,
      `"${e.location.replace(/"/g, '""')}"`,
      e.status,
      e.capacity,
      activeMap[e.id] || 0,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `nowshera_events_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    success('Event report CSV downloaded.');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold mb-1">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics & Governance</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Reports & Capacity Auditing</h1>
          <p className="mt-1 text-sm text-slate-400">
            Comprehensive breakdown of events, reservations, and community capacity metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-export-reports-csv"
            onClick={handleExportEventsCSV}
            disabled={events.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Compiling report statistics from database..." />
      ) : (
        <>
          {/* Events Breakdown Section */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <span>Events Status Breakdown</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Total Events
                </span>
                <div className="text-3xl font-black text-white">{totalEvents}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">All registered records</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
                  Published Events
                </span>
                <div className="text-3xl font-black text-emerald-300">{publishedEvents}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">Accepting registrations</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block mb-1">
                  Completed Events
                </span>
                <div className="text-3xl font-black text-cyan-300">{completedEvents}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">Concluded workshops</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-rose-400 uppercase tracking-wider block mb-1">
                  Cancelled Events
                </span>
                <div className="text-3xl font-black text-rose-300">{cancelledEvents}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">Terminated sessions</span>
              </div>
            </div>
          </div>

          {/* Registrations & Capacity Breakdown Section */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              <span>Registrations & Capacity Allocation</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-1">
                  Total Registrations
                </span>
                <div className="text-3xl font-black text-white">{totalRegistrations}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">Cumulative transactions</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider block mb-1">
                  Active Registrations
                </span>
                <div className="text-3xl font-black text-indigo-300">{activeRegistrations}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">Confirmed seats</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-rose-400 uppercase tracking-wider block mb-1">
                  Cancelled Bookings
                </span>
                <div className="text-3xl font-black text-rose-300">{cancelledRegistrations}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">Seats released</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-teal-400 uppercase tracking-wider block mb-1">
                  Event Capacity
                </span>
                <div className="text-3xl font-black text-teal-300">{totalCapacity}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">Total seat inventory</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl">
                <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider block mb-1">
                  Remaining Capacity
                </span>
                <div className="text-3xl font-black text-cyan-300">{remainingCapacity}</div>
                <span className="text-[11px] text-slate-500 mt-1 block">Available for booking</span>
              </div>
            </div>
          </div>

          {/* Capacity Utilization Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-white">Community Engagement & Capacity Efficiency</h3>
                <p className="text-xs text-slate-400">
                  {activeRegistrations} confirmed attendees out of {totalCapacity} total seat capacity across {totalEvents} workshops.
                </p>
              </div>
              <div className="text-2xl font-mono font-black text-emerald-400">{occupancyRate}% Booked</div>
            </div>

            <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-700"
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
