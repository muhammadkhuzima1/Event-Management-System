import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  Ticket,
  AlertCircle,
  RefreshCw,
  Sparkles,
  User,
  Mail,
  XCircle
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { EventItem, Registration } from '../types/database';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ConfigNotice } from '../components/common/ConfigNotice';

import {
  isSupabaseConfigured,
  supabase,
  getActiveSupabaseClient
} from '../lib/supabase';

import { getEventCoverImage } from '../assets/eventImages';
import { SeatGrid } from '../components/events/SeatGrid';

import {
  fetchEventById,
  registerAttendeeForEvent,
  fetchUserRegistrations,
  cancelRegistration
} from '../lib/eventsStore';

interface EventDetailPageProps {
  eventId: string;
  navigate: (path: string) => void;
}

export const EventDetailPage: React.FC<EventDetailPageProps> = ({
  eventId,
  navigate
}) => {
  const { user, profile, isAdmin } = useAuth();
  const { success, error } = useToast();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const [isCanceling, setIsCanceling] = useState<boolean>(false);

  const [userRegistration, setUserRegistration] =
    useState<Registration | null>(null);

  const [issuedTicketCode, setIssuedTicketCode] =
    useState<string | null>(null);

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);

  // --------------------------------------------------
  // LOAD EVENT + REGISTRATION
  // --------------------------------------------------
  const loadEventAndRegistration = async () => {
    try {
      setLoading(true);

      const client = await getActiveSupabaseClient();

      // --------------------------------------------------
      // 1. LOAD EVENT
      // --------------------------------------------------
      let currentEvent: EventItem | null = null;

      if (isSupabaseConfigured) {
        const { data: dbEvent, error: dbErr } = await client
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

        if (dbEvent && !dbErr) {
          currentEvent = dbEvent;
        }
      }

      if (!currentEvent) {
        currentEvent = await fetchEventById(eventId);
      }

      if (!currentEvent) {
        setEvent(null);
        return;
      }

      // --------------------------------------------------
      // 2. GET REAL ACTIVE REGISTRATION COUNT
      // --------------------------------------------------
      let activeRegisteredCount = 0;

      if (isSupabaseConfigured) {
        const { data: activeCount, error: regCountErr } =
          await client.rpc('get_event_active_count', {
            p_event_id: eventId
          });

        if (!regCountErr && typeof activeCount === 'number') {
          activeRegisteredCount = activeCount;
        } else if (regCountErr) {
          console.warn(
            'Error fetching active registration count:',
            regCountErr.message
          );
        }
      }

      // --------------------------------------------------
      // 3. CALCULATE CAPACITY
      // --------------------------------------------------
      const numericCapacity = Number(currentEvent.capacity);

      const capacity =
        Number.isFinite(numericCapacity) && numericCapacity > 0
          ? numericCapacity
          : 0;

      const registeredCount = activeRegisteredCount;

      const availableSeats = Math.max(
        0,
        capacity - registeredCount
      );

      const isEventFull =
        capacity > 0 &&
        registeredCount >= capacity;

      // --------------------------------------------------
      // 4. UPDATE EVENT STATE
      // --------------------------------------------------
      setEvent({
        ...currentEvent,
        capacity,
        active_registrations_count: registeredCount,
        available_places: availableSeats,
        is_full: isEventFull
      });

      // --------------------------------------------------
      // 5. CHECK CURRENT USER REGISTRATION
      // --------------------------------------------------
      const currentUserEmail =
        user?.email || guestEmail;

      const currentUserId = user?.id;

      if (currentUserId) {
        const { data: myActiveReg } = await supabase
          .from('registrations')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', currentUserId)
          .eq('status', 'active')
          .maybeSingle();

        if (myActiveReg) {
          setUserRegistration(myActiveReg);

          setIssuedTicketCode(
            `TKT-NOW-${myActiveReg.id
              .slice(0, 8)
              .toUpperCase()}`
          );
        } else {
          setUserRegistration(null);
          setIssuedTicketCode(null);
        }
      } else if (currentUserEmail) {
        const userRegs = await fetchUserRegistrations(
          undefined,
          currentUserEmail
        );

        const activeReg = userRegs.find(
          (r) =>
            r.event_id === eventId &&
            r.status === 'active'
        );

        if (activeReg) {
          setUserRegistration(activeReg);

          setIssuedTicketCode(
            `TKT-NOW-${activeReg.id
              .slice(0, 8)
              .toUpperCase()}`
          );
        } else {
          setUserRegistration(null);
          setIssuedTicketCode(null);
        }
      } else {
        setUserRegistration(null);
        setIssuedTicketCode(null);
      }
    } catch (err) {
      console.error(
        'Failed to load event details:',
        err
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // LOAD + REAL-TIME SYNC
  // --------------------------------------------------
  useEffect(() => {
    loadEventAndRegistration();

    const channel = supabase
      .channel(`event-capacity-sync-${eventId}`)

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registrations',
          filter: `event_id=eq.${eventId}`
        },
        () => {
          loadEventAndRegistration();
        }
      )

      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`
        },
        () => {
          loadEventAndRegistration();
        }
      )

      .on(
        'broadcast',
        { event: 'registration_update' },
        (payload) => {
          if (
            !payload?.payload?.eventId ||
            payload.payload.eventId === eventId
          ) {
            loadEventAndRegistration();
          }
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, user?.id]);

  // --------------------------------------------------
  // REGISTER
  // --------------------------------------------------
  const handleRegister = async () => {
    if (!event) return;

    // --------------------------------------------------
    // SECURITY CHECK 1: STATUS
    // --------------------------------------------------
    if (event.status !== 'published') {
      if (event.status === 'cancelled') {
        error(
          'This event has been cancelled. Registration is not available.'
        );
      } else if (event.status === 'completed') {
        error(
          'This event has already been completed. Registration is not available.'
        );
      } else {
        error(
          'Registration is only available for published events.'
        );
      }

      return;
    }

    // --------------------------------------------------
    // SECURITY CHECK 2: EVENT DATE + TIME
    // --------------------------------------------------
    const eventDateTime = new Date(
      `${event.event_date}T${event.event_time}`
    );

    const now = new Date();

    if (eventDateTime <= now) {
      error(
        'This event has already started or ended. Registration is closed.'
      );
      return;
    }

    // --------------------------------------------------
    // SECURITY CHECK 3: CAPACITY
    // --------------------------------------------------
    if (
      event.available_places !== undefined &&
      event.available_places <= 0
    ) {
      error(
        'This event is full. No seats are available.'
      );
      return;
    }

    const emailToUse = (
      user?.email || guestEmail
    ).trim();

    const nameToUse = (
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      guestName ||
      'Attendee'
    ).trim();

    if (!emailToUse) {
      setShowGuestForm(true);
      return;
    }

    try {
      setIsRegistering(true);

      const userIdToUse =
        user?.id || `guest-${Date.now()}`;

      const res = await registerAttendeeForEvent({
        eventId: event.id,
        userId: userIdToUse,
        userEmail: emailToUse,
        userName: nameToUse
      });

      if (res.success) {
        success(res.message);

        if (res.ticketCode) {
          setIssuedTicketCode(res.ticketCode);
        }

        await loadEventAndRegistration();
      } else {
        error(res.message);
        await loadEventAndRegistration();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Registration failed. Please try again.';

      error(msg);

      await loadEventAndRegistration();
    } finally {
      setIsRegistering(false);
    }
  };

  // --------------------------------------------------
  // CANCEL REGISTRATION
  // --------------------------------------------------
  const handleCancelMyRegistration = async () => {
    if (!userRegistration) return;

    try {
      setIsCanceling(true);

      const res = await cancelRegistration(
        userRegistration.id,
        event?.id
      );

      if (res.success) {
        success(
          'Your registration has been cancelled. Your seat is now released.'
        );

        setUserRegistration(null);
        setIssuedTicketCode(null);

        await loadEventAndRegistration();
      } else {
        error(res.message);
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Cancellation failed.';

      error(msg);
    } finally {
      setIsCanceling(false);
    }
  };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------
  if (loading) {
    return (
      <LoadingSpinner
        label="Loading workshop details..."
        fullPage
      />
    );
  }

  // --------------------------------------------------
  // EVENT NOT FOUND
  // --------------------------------------------------
  if (!event) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />

        <h2 className="text-2xl font-bold text-white">
          Event Not Found
        </h2>

        <p className="text-slate-400 text-sm">
          The requested workshop could not be found
          or has been unpublished.
        </p>

        <button
          onClick={() => navigate('/events')}
          className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider"
        >
          Return to Events Directory
        </button>
      </div>
    );
  }

  // --------------------------------------------------
  // CAPACITY VALUES
  // --------------------------------------------------
  const capacity = Number(event.capacity) || 0;

  const activeCount =
    Number(event.active_registrations_count) || 0;

  const available = Math.max(
    0,
    capacity - activeCount
  );

  const isFull =
    capacity > 0 && activeCount >= capacity;

  // --------------------------------------------------
  // EVENT STATUS + DATE CHECK
  // --------------------------------------------------
  const eventDateTime = new Date(
    `${event.event_date}T${event.event_time}`
  );

  const now = new Date();

  const isPastEvent =
    eventDateTime <= now;

  const isPublished =
    event.status === 'published';

  const isCompleted =
    event.status === 'completed';

  const isCancelled =
    event.status === 'cancelled';

  // --------------------------------------------------
  // FINAL REGISTRATION RULE
  // --------------------------------------------------
  const canRegister =
    isPublished &&
    !isPastEvent &&
    !isFull;

  const isAlreadyRegistered =
    Boolean(userRegistration);

  const capacityPercentage =
    capacity > 0
      ? Math.min(
          100,
          Math.round(
            (activeCount / capacity) * 100
          )
        )
      : 0;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);

      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const coverImage = getEventCoverImage(
    event.title,
    event.description
  );

  // --------------------------------------------------
  // REGISTRATION BUTTON TEXT
  // --------------------------------------------------
  const getRegistrationButtonText = () => {
    if (isRegistering) {
      return 'Reserving Seat...';
    }

    if (isCancelled) {
      return 'Event Cancelled';
    }

    if (isCompleted) {
      return 'Event Completed';
    }

    if (isPastEvent) {
      return 'Registration Closed';
    }

    if (isFull) {
      return 'Event Full';
    }

    return 'Confirm Registration & Reserve Seat';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {!isSupabaseConfigured && (
        <ConfigNotice />
      )}

      {/* BACK BUTTON */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/events')}
          className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-emerald-400 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </button>
      </div>

      {/* COVER IMAGE */}
      <div className="relative h-64 sm:h-80 w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">

        <img
          src={coverImage}
          alt={event.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

        <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center gap-2">

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-medium uppercase tracking-wider backdrop-blur-md shadow-md ${
                event.status === 'published'
                  ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                  : event.status === 'completed'
                  ? 'bg-slate-800/80 text-slate-300 border border-slate-700'
                  : event.status === 'cancelled'
                  ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
              }`}
            >
              {event.status}
            </span>

            {isFull && (
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md shadow-md bg-rose-500/25 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Event Full
              </span>
            )}

            {isAlreadyRegistered && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/25 text-cyan-200 border border-cyan-500/40 flex items-center gap-1.5 backdrop-blur-md shadow-md">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-300" />
                You are registered
              </span>
            )}
          </div>

          <div className="text-xs font-mono text-slate-300 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-700/60 backdrop-blur-md">
            ID:{' '}
            <span className="font-semibold text-white">
              {event.id.slice(0, 12)}
            </span>
          </div>

        </div>
      </div>

      {/* TICKET */}
      {isAlreadyRegistered && (
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

            <div className="flex items-start gap-4">

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <Ticket className="w-6 h-6" />
              </div>

              <div>

                <div className="flex items-center gap-2 flex-wrap">

                  <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-bold">
                    Official Admission Ticket
                  </span>

                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Confirmed
                  </span>

                  {userRegistration?.seat_number && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold">
                      Seat #
                      {userRegistration.seat_number < 10
                        ? `0${userRegistration.seat_number}`
                        : userRegistration.seat_number}
                    </span>
                  )}

                </div>

                <h3 className="text-xl font-bold text-white mt-0.5">
                  Ticket #
                  {issuedTicketCode ||
                    'TKT-NOW-CONFIRMED'}
                </h3>

                <p className="text-xs text-slate-300 mt-1">
                  Your seat is guaranteed for{' '}
                  <span className="text-white font-medium">
                    {event.title}
                  </span>.
                </p>

              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">

              <button
                onClick={() =>
                  navigate('/my-registrations')
                }
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all flex items-center gap-1.5"
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>My Registrations</span>
              </button>

              <button
                onClick={
                  handleCancelMyRegistration
                }
                disabled={isCanceling}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-950/60 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" />

                <span>
                  {isCanceling
                    ? 'Cancelling...'
                    : 'Cancel Reservation'}
                </span>
              </button>

            </div>

          </div>
        </div>
      )}

      {/* MAIN CARD */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md space-y-8">

        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          {event.title}
        </h1>

        {/* QUICK FACTS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl bg-slate-950/60 border border-slate-800/80">

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-400" />
              Date
            </span>

            <p className="text-sm font-semibold text-white">
              {formatDate(event.event_date)}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Time
            </span>

            <p className="text-sm font-semibold text-white">
              {event.event_time}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              Location
            </span>

            <p className="text-sm font-semibold text-white truncate">
              {event.location}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              Real Seat Availability
            </span>

            <p className="text-sm font-semibold text-white font-mono">
              <span className="text-emerald-400 font-bold">
                {available}
              </span>{' '}
              of {capacity} available
            </p>
          </div>

        </div>

        {/* CAPACITY */}
        <div className="space-y-2 p-5 rounded-2xl bg-slate-950/40 border border-slate-800/50">

          <div className="flex items-center justify-between text-xs">

            <span className="text-slate-300 font-medium">
              Real-Time Seat Availability
            </span>

            <span className="font-mono font-semibold text-white">
              <span className="text-emerald-400 font-bold text-sm">
                {available}
              </span>{' '}
              of {capacity} seats available (
              {activeCount} registered)
            </span>

          </div>

          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">

            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isFull
                  ? 'bg-rose-500'
                  : capacityPercentage > 85
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{
                width: `${capacityPercentage}%`
              }}
            />

          </div>

          <div className="flex justify-between text-[11px] text-slate-400 font-mono">
            <span>
              {activeCount} confirmed attendee
              registrations
            </span>

            <span>
              {available} seats open for booking (
              {capacityPercentage}% capacity filled)
            </span>
          </div>

        </div>

        {/* SEAT GRID */}
        <SeatGrid
          eventId={event.id}
          capacity={capacity}
          activeCount={activeCount}
          userSeatNumber={
            userRegistration?.seat_number
          }
          isAdmin={isAdmin}
          onCapacityChange={() =>
            loadEventAndRegistration()
          }
        />

        {/* DESCRIPTION */}
        <div className="space-y-3 pt-2">

          <h3 className="text-base font-bold text-white uppercase font-mono tracking-wider text-xs">
            Workshop Overview & Syllabus
          </h3>

          <p className="text-slate-300 leading-relaxed whitespace-pre-line text-sm sm:text-base">
            {event.description ||
              'No detailed description provided for this event.'}
          </p>

        </div>

        {/* REGISTRATION */}
        <div className="pt-6 border-t border-slate-800/80">

          {/* CLOSED EVENT MESSAGE */}
          {!canRegister && !isAlreadyRegistered && (
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800">

              <div className="flex items-center gap-3">

                <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                </div>

                <div>

                  <h4 className="text-base font-bold text-white">
                    {isCancelled
                      ? 'Event Cancelled'
                      : isCompleted
                      ? 'Event Completed'
                      : isPastEvent
                      ? 'Registration Closed'
                      : isFull
                      ? 'Event Full'
                      : 'Registration Unavailable'}
                  </h4>

                  <p className="text-xs text-slate-400 mt-1">

                    {isCancelled
                      ? 'This event has been cancelled. Registration is no longer available.'
                      : isCompleted
                      ? 'This event has already been completed. Registration is no longer available.'
                      : isPastEvent
                      ? 'This event has already started or ended. Registration is closed.'
                      : isFull
                      ? 'All seats for this event have been reserved.'
                      : 'Registration is currently unavailable for this event.'}

                  </p>

                </div>

              </div>

            </div>
          )}

          {/* REGISTRATION FORM */}
          {canRegister && !isAlreadyRegistered && (
            <div className="bg-slate-950/80 rounded-2xl p-6 border border-slate-800 space-y-4">

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                <div>

                  <h4 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Reserve Your Seat
                  </h4>

                  <p className="text-xs text-slate-400 mt-0.5">
                    Admission is free. Workstation and
                    lab materials provided for all
                    confirmed attendees.
                  </p>

                </div>

                <div className="text-right">

                  <div className="text-sm font-mono font-bold text-emerald-400">
                    {available} of {capacity} Seats Available
                  </div>

                  <div className="text-[11px] text-slate-400 font-mono">
                    {activeCount > 0
                      ? `${activeCount} already registered`
                      : 'Be the first to register'}
                  </div>

                </div>

              </div>

              {/* AUTHENTICATED USER */}
              {user ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800/60">

                  <div className="flex items-center gap-3">

                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      {profile?.full_name?.charAt(0) ||
                        user.email
                          ?.charAt(0)
                          .toUpperCase()}
                    </div>

                    <div>

                      <p className="text-xs font-semibold text-white">
                        Registering as:{' '}
                        {profile?.full_name ||
                          'Attendee'}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {user.email}
                      </p>

                    </div>

                  </div>

                  <button
                    id="btn-submit-registration"
                    onClick={handleRegister}
                    disabled={
                      isRegistering ||
                      !canRegister
                    }
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >

                    {isRegistering ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>
                          Reserving Seat...
                        </span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {getRegistrationButtonText()}
                        </span>
                      </>
                    )}

                  </button>

                </div>
              ) : (
                /* GUEST */
                <div className="space-y-4 pt-3 border-t border-slate-800/60">

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

                    <div className="space-y-1">

                      <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                        Attendee Full Name
                      </label>

                      <div className="relative">

                        <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />

                        <input
                          id="input-guest-name"
                          type="text"
                          required
                          placeholder="Your Full Name"
                          value={guestName}
                          onChange={(e) =>
                            setGuestName(
                              e.target.value
                            )
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />

                      </div>

                    </div>

                    <div className="space-y-1">

                      <label className="text-[11px] font-mono uppercase tracking-wider text-slate-300 font-semibold">
                        Email Address for Ticket
                      </label>

                      <div className="relative">

                        <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />

                        <input
                          id="input-guest-email"
                          type="email"
                          required
                          placeholder="name@example.com"
                          value={guestEmail}
                          onChange={(e) =>
                            setGuestEmail(
                              e.target.value
                            )
                          }
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        />

                      </div>

                    </div>

                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">

                    <div className="text-xs text-slate-400">

                      Already registered?{' '}

                      <button
                        onClick={() =>
                          navigate('/login')
                        }
                        className="text-emerald-400 hover:text-emerald-300 font-semibold underline ml-1"
                      >
                        Sign in to account
                      </button>

                    </div>

                    <button
                      id="btn-submit-guest-registration"
                      onClick={handleRegister}
                      disabled={
                        isRegistering ||
                        !canRegister
                      }
                      className="w-full sm:w-auto px-8 py-3 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >

                      {isRegistering ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>
                            Issuing Ticket...
                          </span>
                        </>
                      ) : (
                        <>
                          <Ticket className="w-4 h-4" />
                          <span>
                            {getRegistrationButtonText()}
                          </span>
                        </>
                      )}

                    </button>

                  </div>

                </div>
              )}

            </div>
          )}

        </div>

        {/* ADMIN */}
        {isAdmin && (
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/50 flex items-center justify-between text-xs text-indigo-300">

            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />

              <span>
                Admin Options: Manage attendees
                and registrations
              </span>
            </span>

            <div className="flex items-center gap-2">

              <button
                onClick={() =>
                  navigate(
                    `/admin/events/${event.id}/attendees`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
              >
                View Attendees ({activeCount})
              </button>

              <button
                onClick={() =>
                  navigate(
                    `/admin/events/${event.id}`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
              >
                Edit Event
              </button>

            </div>

          </div>
        )}

      </div>
    </div>
  );
};