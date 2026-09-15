import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Save, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  AlertCircle, 
  ShieldCheck, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { EventItem, EventStatus } from '../../types/database';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfigNotice } from '../../components/common/ConfigNotice';
import { useToast } from '../../context/ToastContext';
import { fetchEventById, getCustomEvents, saveCustomEvents, saveEventCapacity } from '../../lib/eventsStore';
import { SeatGrid } from '../../components/events/SeatGrid';

interface AdminEventDetailPageProps {
  eventId: string;
  navigate: (path: string) => void;
}

export const AdminEventDetailPage: React.FC<AdminEventDetailPageProps> = ({ eventId, navigate }) => {
  const { success, error: toastError } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [activeCount, setActiveCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState<number | string>(15);
  const [status, setStatus] = useState<EventStatus>('draft');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchEventAndRegistrations = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let eventData: EventItem | null = null;

      if (isSupabaseConfigured) {
        const { data, error: eventErr } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

        if (data) {
          eventData = data;
        }
      }

      if (!eventData) {
        eventData = await fetchEventById(eventId);
      }

      if (!eventData) {
        setEvent(null);
        return;
      }

      // Query active registrations count
      let currentActive = eventData.active_registrations_count || 0;
      if (isSupabaseConfigured) {
        try {
          const { count } = await supabase
            .from('registrations')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('status', 'active');

          if (count !== null && count !== undefined) {
            currentActive = count;
          }
        } catch {
          // Keep count from eventData
        }
      }

      setActiveCount(currentActive);
      setEvent(eventData);
      setTitle(eventData.title || '');
      setDescription(eventData.description || '');
      setEventDate(eventData.event_date || '');
      setEventTime(eventData.event_time || '');
      setLocation(eventData.location || '');
      setCapacity(eventData.capacity || 0);
      setStatus(eventData.status || 'draft');
    } catch (err) {
      console.error('Failed to load event details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventAndRegistrations();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (!eventDate.trim()) {
      setFormError('Event date is required.');
      return;
    }
    if (!eventTime.trim()) {
      setFormError('Event time is required.');
      return;
    }
    if (!location.trim()) {
      setFormError('Location is required.');
      return;
    }

    const capNum = Number(capacity);
    if (isNaN(capNum) || capNum <= 0 || !Number.isInteger(capNum)) {
      setFormError('Capacity must be a positive whole number.');
      return;
    }

    // Capacity restriction: "When editing capacity: Do not allow the admin to reduce capacity below the number of active registrations."
    if (capNum < activeCount) {
      setFormError(
        `Cannot reduce capacity to ${capNum}. There are already ${activeCount} active registrations for this event.`
      );
      return;
    }

    // Do not allow an event to be published if required info is missing
    if (status === 'published') {
      if (!title || !eventDate || !eventTime || !location || capNum <= 0) {
        setFormError('Cannot publish an event with missing required fields.');
        return;
      }
    }

    try {
      setIsSaving(true);
      let supabaseError = null;

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('events')
          .update({
            title: title.trim(),
            description: description.trim(),
            event_date: eventDate,
            event_time: eventTime.trim(),
            location: location.trim(),
            capacity: capNum,
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', eventId);

        if (error) {
          supabaseError = error;
        }
      }

      saveEventCapacity(eventId, capNum);

      // Update in local custom events if present
      const custom = getCustomEvents();
      const cIdx = custom.findIndex((c) => c.id === eventId);
      if (cIdx !== -1) {
        custom[cIdx] = {
          ...custom[cIdx],
          title: title.trim(),
          description: description.trim(),
          event_date: eventDate,
          event_time: eventTime.trim(),
          location: location.trim(),
          capacity: capNum,
          status,
          updated_at: new Date().toISOString(),
        };
        saveCustomEvents(custom);
      } else if (supabaseError) {
        setFormError(supabaseError.message);
        toastError(supabaseError.message);
        return;
      }

      success('Event updated successfully.');
      await fetchEventAndRegistrations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update event.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading event configuration..." fullPage />;
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Event Not Found</h2>
        <button
          onClick={() => navigate('/admin/events')}
          className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-700 text-xs font-semibold"
        >
          Back to Events List
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/events')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold mb-0.5">
              Event Editor
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Edit: {event.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/admin/events/${eventId}/attendees`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors"
          >
            <Users className="w-4 h-4" />
            <span>View Attendees ({activeCount})</span>
          </button>

          <button
            onClick={() => navigate(`/events/${eventId}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Preview Page
          </button>
        </div>
      </div>

      {/* Capacity & Active Registrations Warning Strip */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-white block text-sm">
              {activeCount} Active Reservations
            </span>
            <span className="text-slate-400">
              Capacity cannot be set below {activeCount} to safeguard existing attendees.
            </span>
          </div>
        </div>

        <div className="font-mono text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
          Minimum Capacity: <span className="text-emerald-400 font-bold">{activeCount}</span>
        </div>
      </div>

      {formError && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      )}

      {/* Seat Allocation & Management Grid */}
      <SeatGrid
        eventId={eventId}
        capacity={Number(capacity) || 15}
        activeCount={activeCount}
        isAdmin={true}
        onCapacityChange={(newCap) => {
          setCapacity(newCap);
          fetchEventAndRegistrations();
        }}
      />

      {/* Edit Form */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
              Event Title *
            </label>
            <input
              id="edit-event-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
              Full Description
            </label>
            <textarea
              id="edit-event-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                Event Date *
              </label>
              <input
                id="edit-event-date"
                type="date"
                required
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                Event Time *
              </label>
              <input
                id="edit-event-time"
                type="text"
                required
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                Location *
              </label>
              <input
                id="edit-event-location"
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                  Capacity (Min {activeCount}) *
                </label>
                <div className="flex items-center gap-1">
                  {[10, 12, 14, 15].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      disabled={preset < activeCount}
                      onClick={() => setCapacity(preset)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                        Number(capacity) === preset
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
              <input
                id="edit-event-capacity"
                type="number"
                min={activeCount}
                step={1}
                required
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
              Event Status
            </label>
            <select
              id="edit-event-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="completed">Completed (Concluded, no new registrations)</option>
              <option value="cancelled">Cancelled (Closed, retains audit records)</option>
            </select>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            <p className="font-semibold text-slate-300 mb-1">Data Retention Rule</p>
            <p>
              Hard deletion is disabled to preserve historical workshop attendance and member registration integrity.
              Events can be set to Cancelled or Completed instead.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/events')}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-event-changes"
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Event Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
