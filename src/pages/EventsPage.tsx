import React, { useEffect, useState } from 'react';
import {
  Search,
  Calendar,
  RefreshCw,
  Sparkles,
  MapPin,
  Code2,
  Clock,
  Users,
  ArrowRight,
  Check,
  Ticket,
  Laptop,
} from 'lucide-react';
import { EventItem } from '../types/database';
import { EventCard } from '../components/events/EventCard';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ConfigNotice } from '../components/common/ConfigNotice';
import { useAuth } from '../context/AuthContext';
import { webDevWorkshopImg } from '../assets/eventImages';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { fetchAllEvents, fetchUserRegistrations } from '../lib/eventsStore';

interface EventsPageProps {
  navigate: (path: string) => void;
}

export const EventsPage: React.FC<EventsPageProps> = ({ navigate }) => {
  const { user } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [userRegisteredEventIds, setUserRegisteredEventIds] = useState<Set<string>>(
    new Set()
  );

  const loadEvents = async () => {
    try {
      setLoading(true);

      const all = await fetchAllEvents();

      // IMPORTANT:
      // Keep ALL events visible to attendees.
      // Status and date determine whether registration is allowed,
      // but they should NOT remove the event from the event list.
      setEvents(all);

      if (user) {
        const regs = await fetchUserRegistrations(user.id, user.email);

        const activeIds = new Set(
          regs
            .filter((r) => r.status === 'active')
            .map((r) => r.event_id)
        );

        setUserRegisteredEventIds(activeIds);
      } else {
        setUserRegisteredEventIds(new Set());
      }
    } catch (err) {
      console.error('Unexpected error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel('events-list-capacity-sync')
      .on('broadcast', { event: 'registration_update' }, () => {
        loadEvents();
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
        },
        () => {
          loadEvents();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
        },
        () => {
          loadEvents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Extract unique locations
  const locations = [
    'all',
    ...Array.from(
      new Set(
        events
          .map((e) => e.location?.trim())
          .filter(Boolean)
      )
    ),
  ];

  // Search + location filtering ONLY.
  // We intentionally do NOT filter by status or date.
  const filteredEvents = events.filter((ev) => {
    const search = searchQuery.toLowerCase();

    const matchesSearch =
      ev.title.toLowerCase().includes(search) ||
      ev.description?.toLowerCase().includes(search) ||
      ev.location.toLowerCase().includes(search);

    const matchesLocation =
      selectedLocation === 'all' ||
      ev.location.trim() === selectedLocation;

    return matchesSearch && matchesLocation;
  });

  // Find featured Web Dev event
  const webDevEvent = events.find(
    (e) =>
      e.title.toLowerCase().includes('web') ||
      e.id.toLowerCase().includes('web')
  );

  // Determine whether an event can accept registration
  const canRegister = (event: EventItem): boolean => {
    const status = String(event.status || '').toLowerCase();

    const capacity = Number(event.capacity);
    const reserved = Number(event.active_registrations_count || 0);

    const available =
      Number.isFinite(capacity) && capacity > 0
        ? Math.max(0, capacity - reserved)
        : 0;

    const eventDateTime = new Date(
      `${event.event_date}T${event.event_time}`
    );

    const isFuture = eventDateTime.getTime() > Date.now();

    return (
      status === 'published' &&
      isFuture &&
      available > 0
    );
  };

  // Status label for featured event
  const getStatusLabel = (event: EventItem): string => {
    const status = String(event.status || '').toLowerCase();

    if (status === 'cancelled') {
      return 'Cancelled';
    }

    if (status === 'completed') {
      return 'Completed';
    }

    const eventDateTime = new Date(
      `${event.event_date}T${event.event_time}`
    );

    if (eventDateTime.getTime() <= Date.now()) {
      return 'Event Ended';
    }

    if (status === 'draft') {
      return 'Draft';
    }

    if (!canRegister(event)) {
      return 'Event Full';
    }

    return 'Open for Registration';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Official Event Discovery</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Workshops & Seminars
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Browse events in Nowshera. Past, completed, and cancelled events
            remain visible, while registration is available only for eligible
            published events.
          </p>
        </div>

        <button
          onClick={loadEvents}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${
              loading ? 'animate-spin' : ''
            }`}
          />
          <span>Refresh Availability</span>
        </button>
      </div>

      {/* Featured Web Development Event */}
      {webDevEvent && (
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-indigo-500/30 rounded-3xl overflow-hidden shadow-2xl relative">
          <div className="grid grid-cols-1 lg:grid-cols-12">

            <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-full bg-slate-950 overflow-hidden group">
              <img
                src={webDevWorkshopImg}
                alt="Web Development Bootcamp"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500 ease-out"
              />

              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-900 via-slate-900/40 to-transparent" />

              <div className="absolute top-4 left-4 flex flex-wrap gap-2">

                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 backdrop-blur-md flex items-center gap-1.5 shadow-lg">
                  <Laptop className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Featured Web Dev Workshop</span>
                </span>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono backdrop-blur-md ${
                    canRegister(webDevEvent)
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                      : 'bg-red-500/25 text-red-300 border border-red-500/40'
                  }`}
                >
                  {getStatusLabel(webDevEvent)}
                </span>
              </div>

              <div className="absolute bottom-4 left-4 text-xs font-mono text-slate-200 backdrop-blur-md bg-slate-950/80 px-3 py-1 rounded-full border border-emerald-500/30">
                <span className="text-emerald-400 font-bold">
                  {webDevEvent.available_places ?? 0}
                </span>{' '}
                of {webDevEvent.capacity} Seats Available
              </div>
            </div>

            {/* Featured information */}
            <div className="lg:col-span-7 p-6 sm:p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-3">

                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold flex items-center gap-1.5">
                    <Code2 className="w-4 h-4" />
                    <span>Hands-On Engineering Track</span>
                  </span>

                  {userRegisteredEventIds.has(webDevEvent.id) && (
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Registered
                    </span>
                  )}
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {webDevEvent.title}
                </h2>

                <p className="text-sm text-slate-300 leading-relaxed line-clamp-3">
                  {webDevEvent.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">

                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Date</span>
                    </div>

                    <p className="font-semibold text-white text-xs sm:text-sm">
                      {new Date(
                        webDevEvent.event_date
                      ).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Time</span>
                    </div>

                    <p className="font-semibold text-white text-xs sm:text-sm">
                      {webDevEvent.event_time}
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-mono text-indigo-400">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Venue</span>
                    </div>

                    <p className="font-semibold text-white text-xs sm:text-sm truncate">
                      {webDevEvent.location}
                    </p>
                  </div>
                </div>
              </div>

              {/* Featured action */}
              <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
                  <Users className="w-4 h-4 text-emerald-400" />

                  <span>
                    Seats:{' '}
                    <strong className="text-emerald-400 text-sm font-bold">
                      {webDevEvent.available_places ?? 0} available
                    </strong>{' '}
                    of {webDevEvent.capacity}{' '}
                    (
                    <strong className="text-slate-200">
                      {webDevEvent.active_registrations_count ?? 0}
                    </strong>{' '}
                    booked)
                  </span>
                </div>

                <div className="flex items-center gap-3">

                  <button
                    id="btn-register-featured-webdev"
                    onClick={() =>
                      navigate(`/events/${webDevEvent.id}`)
                    }
                    className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all text-xs flex items-center justify-center gap-2"
                  >
                    <Ticket className="w-4 h-4" />

                    <span>
                      {canRegister(webDevEvent)
                        ? 'Register for Web Dev Event'
                        : 'View Event Details'}
                    </span>

                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

          <input
            id="input-search-events"
            type="text"
            placeholder="Search by workshop title, topic, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

          <select
            id="select-location-filter"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors appearance-none cursor-pointer"
          >
            <option value="all">All Locations</option>

            {locations
              .filter((loc) => loc !== 'all')
              .map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <LoadingSpinner label="Loading events..." />
      ) : filteredEvents.length > 0 ? (

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isRegistered={userRegisteredEventIds.has(event.id)}
              onSelect={(id) => navigate(`/events/${id}`)}
            />
          ))}

        </div>

      ) : (

        <div className="p-12 text-center bg-slate-900/50 rounded-3xl border border-slate-800">
          <p className="text-slate-400 text-sm">
            No events match your current filter criteria.
          </p>
        </div>

      )}
    </div>
  );
};