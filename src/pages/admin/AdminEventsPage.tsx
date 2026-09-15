import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MapPin, 
  Users, 
  ShieldCheck, 
  Edit3, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Eye, 
  FileText,
  RefreshCw,
  X,
  Sparkles,
  Code2,
  Armchair
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { EventItem, EventStatus } from '../../types/database';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { ConfigNotice } from '../../components/common/ConfigNotice';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { fetchAllEvents, getCustomEvents, saveCustomEvents, updateEventCapacity } from '../../lib/eventsStore';

interface AdminEventsPageProps {
  navigate: (path: string) => void;
  initialAction?: string | null;
}

export const AdminEventsPage: React.FC<AdminEventsPageProps> = ({ navigate, initialAction }) => {
  const { isAdmin } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialAction === 'new');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('10:00 AM');
  const [newLocation, setNewLocation] = useState('Nowshera');
  const [newCapacity, setNewCapacity] = useState<number | string>(15);
  const [newStatus, setNewStatus] = useState<EventStatus>('draft');
  const [formError, setFormError] = useState<string | null>(null);

  // Manage Seats Modal State
  const [manageSeatsEvent, setManageSeatsEvent] = useState<EventItem | null>(null);
  const [manageSeatsInput, setManageSeatsInput] = useState<string>('15');
  const [isUpdatingSeats, setIsUpdatingSeats] = useState(false);

  // Quick preset helper for Web Development Bootcamp
  const populateWebDevPreset = () => {
    setNewTitle('Full-Stack Web Development Bootcamp: React 19, TypeScript & Supabase');
    setNewDescription(
      'A comprehensive, hands-on software engineering workshop designed to equip attendees with practical modern web development skills. Master React 19 component architecture, TypeScript type safety, Tailwind CSS styling, responsive layout design, and Supabase cloud database integration.'
    );
    setNewEventDate('2026-10-24');
    setNewEventTime('10:00:00');
    setNewLocation('Nowshera Tech Innovation Hub, Hall B');
    setNewCapacity(12);
    setNewStatus('published');
    setFormError(null);
  };

  // Quick preset helper for Python workshop
  const populatePythonPreset = () => {
    const future = new Date();
    future.setDate(future.getDate() + 21);
    const dateStr = future.toISOString().split('T')[0];

    setNewTitle('Python for Beginners & Data Automation Workshop');
    setNewDescription(
      'An intensive, hands-on workshop designed to introduce fundamentals of Python programming, working with libraries like pandas, creating automation scripts, and solving real-world data challenges in Nowshera.'
    );
    setNewEventDate(dateStr);
    setNewEventTime('10:00:00');
    setNewLocation('Nowshera Tech Innovation Hub, Hall A');
    setNewCapacity(14);
    setNewStatus('published');
    setFormError(null);
  };

  // 1-Click direct creator for Python workshop
  const quickCreatePythonWorkshop = async () => {
    try {
      setIsSubmitting(true);
      const future = new Date();
      future.setDate(future.getDate() + 21);
      const dateStr = future.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('events')
        .insert({
          title: 'Python for Beginners & Data Automation Workshop',
          description:
            'An intensive, hands-on workshop designed to introduce fundamentals of Python programming, working with libraries like pandas, creating automation scripts, and solving real-world data challenges in Nowshera.',
          event_date: dateStr,
          event_time: '10:00:00',
          location: 'Nowshera Tech Innovation Hub, Hall A',
          capacity: 14,
          status: 'published',
        })
        .select()
        .single();

      if (error) {
        toastError(error.message);
        return;
      }

      success('Python Workshop successfully published to database!');
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish workshop.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Change Confirmation Modal
  const [statusChangeTarget, setStatusChangeTarget] = useState<{
    event: EventItem;
    targetStatus: EventStatus;
    title: string;
    message: string;
  } | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const allEvents = await fetchAllEvents();
      setEvents(allEvents);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Validate and handle event creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Strict validation
    if (!newTitle.trim()) {
      setFormError('Event title is required.');
      return;
    }
    if (!newEventDate.trim()) {
      setFormError('Event date is required.');
      return;
    }
    if (!newEventTime.trim()) {
      setFormError('Event time is required.');
      return;
    }
    if (!newLocation.trim()) {
      setFormError('Event location is required.');
      return;
    }

    const capNum = Number(newCapacity);
    if (isNaN(capNum) || capNum <= 0 || !Number.isInteger(capNum)) {
      setFormError('Capacity must be a positive whole number (e.g. 50).');
      return;
    }

    // Do not allow an event to be published if required info is missing
    if (newStatus === 'published') {
      if (!newTitle || !newEventDate || !newEventTime || !newLocation || capNum <= 0) {
        setFormError('Cannot publish an event with missing required information.');
        return;
      }
    }

    try {
      setIsSubmitting(true);

      let createdSuccessfully = false;

      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('events')
          .insert({
            title: newTitle.trim(),
            description: newDescription.trim(),
            event_date: newEventDate,
            event_time: newEventTime.trim(),
            location: newLocation.trim(),
            capacity: capNum,
            status: newStatus,
          })
          .select()
          .maybeSingle();

        if (!error && data) {
          createdSuccessfully = true;
        }
      }

      if (!createdSuccessfully) {
        // Resilient save to custom events store
        const custom = getCustomEvents();
        const newEventObj: EventItem = {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: newTitle.trim(),
          description: newDescription.trim(),
          event_date: newEventDate,
          event_time: newEventTime.trim(),
          location: newLocation.trim(),
          capacity: capNum,
          status: newStatus,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          active_registrations_count: 0,
          available_places: capNum,
        };
        custom.unshift(newEventObj);
        saveCustomEvents(custom);
      }

      success(`Event "${newTitle}" created successfully.`);
      setIsCreateModalOpen(false);
      // Reset form
      setNewTitle('');
      setNewDescription('');
      setNewEventDate('');
      setNewEventTime('10:00 AM');
      setNewLocation('Nowshera');
      setNewCapacity(50);
      setNewStatus('draft');

      // Refresh events list
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create event.';
      setFormError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status transitions
  const confirmStatusChange = (event: EventItem, targetStatus: EventStatus) => {
    if (targetStatus === 'published') {
      if (!event.title || !event.event_date || !event.event_time || !event.location || event.capacity <= 0) {
        toastError('Cannot publish event: missing required fields or invalid capacity.');
        return;
      }
      setStatusChangeTarget({
        event,
        targetStatus,
        title: 'Publish Event?',
        message: `Publishing "${event.title}" will open it to community members for registration.`,
      });
    } else if (targetStatus === 'completed') {
      setStatusChangeTarget({
        event,
        targetStatus,
        title: 'Mark Event as Completed?',
        message: `Marking "${event.title}" as completed will conclude the session. No new registrations will be permitted.`,
      });
    } else if (targetStatus === 'cancelled') {
      setStatusChangeTarget({
        event,
        targetStatus,
        title: 'Cancel Event?',
        message: `Cancelling "${event.title}" will close registration immediately. All registration history will be safely preserved.`,
      });
    }
  };

  const handleExecuteStatusChange = async () => {
    if (!statusChangeTarget) return;

    try {
      setIsChangingStatus(true);
      let supabaseError = null;

      if (isSupabaseConfigured) {
        const { error } = await supabase
          .from('events')
          .update({ status: statusChangeTarget.targetStatus, updated_at: new Date().toISOString() })
          .eq('id', statusChangeTarget.event.id);

        if (error) {
          supabaseError = error;
        }
      }

      // Also update in custom events store if present
      const custom = getCustomEvents();
      const customIdx = custom.findIndex((c) => c.id === statusChangeTarget.event.id);
      if (customIdx !== -1) {
        custom[customIdx].status = statusChangeTarget.targetStatus;
        custom[customIdx].updated_at = new Date().toISOString();
        saveCustomEvents(custom);
      } else if (supabaseError) {
        toastError(supabaseError.message);
        return;
      }

      success(`Event status successfully changed to "${statusChangeTarget.targetStatus}".`);
      setStatusChangeTarget(null);
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update event status.';
      toastError(msg);
    } finally {
      setIsChangingStatus(false);
    }
  };

  // Filter events
  const filteredEvents = events.filter((ev) => {
    const matchesStatus = statusFilter === 'all' || ev.status === statusFilter;
    const matchesSearch =
      ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Event Directory</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Event Management</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create, publish, monitor capacity, and manage workshops across Nowshera.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchEvents}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            id="btn-quick-add-python"
            onClick={quickCreatePythonWorkshop}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 transition-all disabled:opacity-50"
            title="Immediately publish the upcoming Python Workshop to Supabase"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>+ Quick Add Python Workshop</span>
          </button>

          <button
            id="btn-open-create-event"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-admin-search"
            type="text"
            placeholder="Search by event title or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0">
          {(['all', 'draft', 'published', 'completed', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              id={`filter-status-${st}`}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-mono uppercase font-semibold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Events Table / Card View */}
      {loading ? (
        <LoadingSpinner label="Loading events from database..." />
      ) : filteredEvents.length > 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="text-xs font-mono uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Event</th>
                  <th className="py-3.5 px-4">Schedule</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Real Seats Available</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEvents.map((event) => {
                  const isDraft = event.status === 'draft';
                  const isPublished = event.status === 'published';
                  const isCompleted = event.status === 'completed';
                  const isCancelled = event.status === 'cancelled';

                  return (
                    <tr key={event.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-bold text-white max-w-xs truncate">{event.title}</div>
                        <div className="text-xs text-slate-500 font-mono">ID: {event.id.slice(0, 8)}...</div>
                      </td>

                      <td className="py-4 px-4 text-xs font-mono">
                        <div className="text-slate-200">{event.event_date}</div>
                        <div className="text-slate-400">{event.event_time}</div>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-300 max-w-[150px] truncate">
                        {event.location}
                      </td>

                      <td className="py-4 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono uppercase font-semibold ${
                            isPublished
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : isCompleted
                              ? 'bg-slate-700/40 text-slate-300 border border-slate-600/30'
                              : isCancelled
                              ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {event.status}
                        </span>
                      </td>

                      <td className="py-4 px-4 text-xs font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="text-emerald-400 font-bold text-sm">{event.available_places}</span>
                          <span className="text-slate-300">available</span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {event.active_registrations_count} booked of {event.capacity}
                        </div>
                        <button
                          type="button"
                          id={`btn-manage-seats-${event.id}`}
                          onClick={() => {
                            setManageSeatsEvent(event);
                            setManageSeatsInput(String(event.capacity));
                          }}
                          className="mt-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1 transition-colors"
                        >
                          <Armchair className="w-3 h-3" />
                          <span>Manage Seats</span>
                        </button>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {/* Attendees button */}
                          <button
                            id={`btn-attendees-${event.id}`}
                            onClick={() => navigate(`/admin/events/${event.id}/attendees`)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition-colors"
                            title="View registered attendees"
                          >
                            Attendees
                          </button>

                          {/* Edit button */}
                          <button
                            id={`btn-edit-event-${event.id}`}
                            onClick={() => navigate(`/admin/events/${event.id}`)}
                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            title="Edit Event"
                          >
                            Edit
                          </button>

                          {/* Draft actions: Publish */}
                          {isDraft && (
                            <button
                              id={`btn-publish-${event.id}`}
                              onClick={() => confirmStatusChange(event, 'published')}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 transition-colors"
                            >
                              Publish
                            </button>
                          )}

                          {/* Published actions: Complete, Cancel */}
                          {isPublished && (
                            <>
                              <button
                                id={`btn-complete-${event.id}`}
                                onClick={() => confirmStatusChange(event, 'completed')}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 transition-colors"
                                title="Mark Completed"
                              >
                                Complete
                              </button>
                              <button
                                id={`btn-cancel-event-${event.id}`}
                                onClick={() => confirmStatusChange(event, 'cancelled')}
                                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 transition-colors"
                                title="Cancel Event"
                              >
                                Cancel
                              </button>
                            </>
                          )}

                          {/* Public View link */}
                          <button
                            onClick={() => navigate(`/events/${event.id}`)}
                            className="p-1 text-slate-400 hover:text-white transition-colors"
                            title="Open attendee preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : events.length === 0 ? (
        <div className="p-10 text-center bg-slate-900/60 border border-slate-800 rounded-3xl space-y-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">No workshops created yet</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              Your Supabase <code className="text-emerald-400 font-mono text-xs">events</code> table is currently empty.
              You can instantly publish the upcoming Python Workshop with a single click.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left space-y-2 text-xs">
            <div className="font-semibold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Python for Beginners & Data Automation Workshop</span>
            </div>
            <p className="text-slate-400">
              Hands-on Python fundamentals, automation scripts, pandas data processing in Nowshera Tech Innovation Hub.
            </p>
            <div className="flex items-center gap-4 text-slate-400 pt-1">
              <span>Date: Upcoming (3 Weeks)</span>
              <span>Time: 10:00 AM</span>
              <span>Capacity: 45</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              id="btn-empty-quick-add-python"
              onClick={quickCreatePythonWorkshop}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Publish Python Workshop Now</span>
            </button>
            <button
              onClick={() => {
                populatePythonPreset();
                setIsCreateModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Review & Customize First
            </button>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl">
          <p className="text-slate-400">No events matching the selected status filter.</p>
          <button
            onClick={() => setStatusFilter('all')}
            className="mt-3 px-4 py-2 bg-slate-800 rounded-xl text-xs font-semibold text-white hover:bg-slate-700"
          >
            Show All Events
          </button>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-8">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-mono uppercase text-indigo-400 font-semibold mb-1">
                <Plus className="w-3.5 h-3.5" />
                <span>New Event Listing</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Create Workshop or Seminar</h2>
              <p className="text-xs text-slate-400 mt-1">
                Fill in the workshop parameters. Events are stored directly in the database.
              </p>
            </div>

            {formError && (
              <div className="mb-6 p-4 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-200 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Quick preset banner */}
            <div className="mb-4 p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-indigo-300">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Quick-Load Workshop Presets</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  id="btn-fill-webdev-preset"
                  onClick={populateWebDevPreset}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex items-center gap-1.5"
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Full-Stack Web Dev Bootcamp</span>
                </button>
                <button
                  type="button"
                  id="btn-fill-python-preset"
                  onClick={populatePythonPreset}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Python & Automation Workshop</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-left">
              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                  Event Title *
                </label>
                <input
                  id="create-event-title"
                  type="text"
                  required
                  placeholder="e.g. Nowshera Web Development Bootcamp"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                  Description
                </label>
                <textarea
                  id="create-event-desc"
                  rows={3}
                  placeholder="Details regarding curriculum, prerequisites, speaker information..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                    Event Date *
                  </label>
                  <input
                    id="create-event-date"
                    type="date"
                    required
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                    Event Time *
                  </label>
                  <input
                    id="create-event-time"
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                    Location *
                  </label>
                  <input
                    id="create-event-location"
                    type="text"
                    required
                    placeholder="e.g. Nowshera Community Center"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                      Seats (10 - 15) *
                    </label>
                    <div className="flex items-center gap-1">
                      {[10, 12, 14, 15].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setNewCapacity(preset)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                            Number(newCapacity) === preset
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    id="create-event-capacity"
                    type="number"
                    min={1}
                    step={1}
                    required
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                  Initial Status
                </label>
                <select
                  id="create-event-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as EventStatus)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="draft">Draft (Private, not open for registration)</option>
                  <option value="published">Published (Live & open for registration)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-event"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? 'Creating Event...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Event Seats Modal */}
      {manageSeatsEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Manage Event Seats</h3>
                  <p className="text-xs text-slate-400 truncate max-w-[240px]">
                    {manageSeatsEvent.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManageSeatsEvent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span>Active Booked Registrations:</span>
                <strong className="text-white font-mono">{manageSeatsEvent.active_registrations_count || 0}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Current Seat Capacity:</span>
                <strong className="text-emerald-400 font-mono">{manageSeatsEvent.capacity}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span>Minimum Allowed Capacity:</span>
                <strong className="text-amber-400 font-mono">{manageSeatsEvent.active_registrations_count || 0}</strong>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-mono text-slate-300 uppercase font-semibold">
                Set Seat Number (10 - 15)
              </label>

              <div className="flex items-center gap-2">
                {[10, 12, 14, 15].map((preset) => {
                  const minActive = manageSeatsEvent.active_registrations_count || 0;
                  const isLow = preset < minActive;
                  return (
                    <button
                      key={preset}
                      type="button"
                      disabled={isLow}
                      onClick={() => setManageSeatsInput(String(preset))}
                      className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                        Number(manageSeatsInput) === preset
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 disabled:opacity-30'
                      }`}
                    >
                      {preset} Seats
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="number"
                  min={manageSeatsEvent.active_registrations_count || 1}
                  step={1}
                  value={manageSeatsInput}
                  onChange={(e) => setManageSeatsInput(e.target.value)}
                  placeholder="Custom number of seats"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono text-center"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setManageSeatsEvent(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdatingSeats}
                onClick={async () => {
                  const capNum = Number(manageSeatsInput);
                  const minActive = manageSeatsEvent.active_registrations_count || 0;
                  if (isNaN(capNum) || capNum < minActive) {
                    toastError(`Capacity cannot be less than ${minActive} (active registrations).`);
                    return;
                  }

                  try {
                    setIsUpdatingSeats(true);
                    const res = await updateEventCapacity(manageSeatsEvent.id, capNum);
                    if (res.success) {
                      success(`Seat capacity updated to ${capNum} for ${manageSeatsEvent.title}!`);
                      setManageSeatsEvent(null);
                      await fetchEvents();
                    } else {
                      toastError(res.message);
                    }
                  } catch {
                    toastError('Failed to update seat number.');
                  } finally {
                    setIsUpdatingSeats(false);
                  }
                }}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {isUpdatingSeats ? 'Saving...' : 'Save Seats'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {statusChangeTarget && (
        <ConfirmModal
          isOpen={Boolean(statusChangeTarget)}
          title={statusChangeTarget.title}
          message={statusChangeTarget.message}
          confirmLabel={`Yes, Set as ${statusChangeTarget.targetStatus}`}
          cancelLabel="Dismiss"
          confirmVariant={statusChangeTarget.targetStatus === 'cancelled' ? 'danger' : 'primary'}
          isLoading={isChangingStatus}
          onConfirm={handleExecuteStatusChange}
          onCancel={() => setStatusChangeTarget(null)}
        />
      )}
    </div>
  );
};
