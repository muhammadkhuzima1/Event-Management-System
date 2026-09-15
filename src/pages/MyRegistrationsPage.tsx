import React, { useEffect, useState } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Ticket, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  RefreshCw,
  QrCode
} from 'lucide-react';
import { Registration } from '../types/database';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { ConfigNotice } from '../components/common/ConfigNotice';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { fetchUserRegistrations, cancelRegistration } from '../lib/eventsStore';
import { getEventCoverImage } from '../assets/eventImages';

interface MyRegistrationsPageProps {
  navigate: (path: string) => void;
}

export const MyRegistrationsPage: React.FC<MyRegistrationsPageProps> = ({ navigate }) => {
  const { user } = useAuth();
  const { success, error } = useToast();

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForCancel, setSelectedForCancel] = useState<Registration | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);

  const fetchRegistrations = async () => {
    try {
      setLoading(true);
      const data = await fetchUserRegistrations(user?.id, user?.email);
      setRegistrations(data);
    } catch (err) {
      console.error('Failed to load registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistrations();
  }, [user]);

  const handleConfirmCancel = async () => {
    if (!selectedForCancel) return;

    try {
      setIsCanceling(true);
      const res = await cancelRegistration(selectedForCancel.id);

      if (res.success) {
        success('Registration cancelled successfully. Your seat has been released.');
        setSelectedForCancel(null);
        await fetchRegistrations();
      } else {
        error(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to cancel registration.';
      error(msg);
    } finally {
      setIsCanceling(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getTicketCode = (reg: Registration) => {
    return `TKT-NOW-${reg.id.slice(0, 8).toUpperCase()}`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
            <Ticket className="w-3.5 h-3.5" />
            <span>Attendee Portal</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">My Registrations</h1>
          <p className="mt-1 text-sm text-slate-400">
            View all workshops and reserved admission tickets under your account.
          </p>
        </div>

        <button
          onClick={fetchRegistrations}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Loading state */}
      {loading ? (
        <LoadingSpinner label="Loading your confirmed registrations..." />
      ) : registrations.length === 0 ? (
        <EmptyState
          title="No Registrations Yet"
          description="You haven't reserved tickets for any upcoming events. Explore our workshops to join our community sessions."
          actionLabel="Browse Available Events"
          onAction={() => navigate('/events')}
        />
      ) : (
        <div className="space-y-4">
          {registrations.map((reg) => {
            const isActive = reg.status === 'active';
            const eventTitle = reg.event?.title || 'Workshop Session';
            const coverImage = getEventCoverImage(eventTitle);
            const ticketCode = getTicketCode(reg);

            return (
              <div
                key={reg.id}
                className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all hover:border-slate-700 overflow-hidden"
              >
                {/* Event Thumbnail & Details */}
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-slate-950 shrink-0 border border-slate-800 hidden sm:block">
                    <img
                      src={coverImage}
                      alt={eventTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                          isActive
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Confirmed Seat</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Cancelled</span>
                          </>
                        )}
                      </span>

                      <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-800">
                        #{ticketCode}
                      </span>
                    </div>

                    <h2
                      onClick={() => reg.event && navigate(`/events/${reg.event.id}`)}
                      className="text-lg font-bold text-white hover:text-emerald-400 cursor-pointer transition-colors"
                    >
                      {eventTitle}
                    </h2>

                    {reg.event && (
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                        <div className="flex items-center gap-1 text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{formatDate(reg.event.event_date)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300">
                          <Clock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{reg.event.event_time}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate max-w-[200px]">{reg.event.location}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end pt-4 md:pt-0 border-t md:border-t-0 border-slate-800">
                  {reg.event && (
                    <button
                      onClick={() => navigate(`/events/${reg.event!.id}`)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5"
                    >
                      <span>View Event</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isActive && (
                    <button
                      onClick={() => setSelectedForCancel(reg)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 transition-colors flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel Seat</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(selectedForCancel)}
        title="Cancel Event Registration?"
        message={`Are you sure you want to cancel your seat for "${
          selectedForCancel?.event?.title || 'this event'
        }"? This will release your spot to other attendees.`}
        confirmLabel={isCanceling ? 'Cancelling...' : 'Yes, Cancel Registration'}
        cancelLabel="Keep My Spot"
        onConfirm={handleConfirmCancel}
        onCancel={() => setSelectedForCancel(null)}
      />
    </div>
  );
};
