import {
  supabase,
  isSupabaseConfigured,
  getActiveSupabaseClient,
  rpcRegisterForEvent,
  rpcCancelRegistration,
  formatRpcError
} from './supabase';

import { EventItem, Registration } from '../types/database';
import { DEFAULT_EVENTS } from '../data/defaultEvents';

const LOCAL_STORAGE_CUSTOM_EVENTS_KEY =
  'nowshera_custom_events_v2';

const LOCAL_STORAGE_CAPACITY_OVERRIDES_KEY =
  'nowshera_event_capacity_overrides_v2';

export interface LocalRegistrationRecord {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  event_id: string;
  status: 'active' | 'cancelled';
  created_at: string;
  ticket_code: string;
  event: EventItem;
  seat_number?: number;
}

// --------------------------------------------------
// LOCAL REGISTRATION FUNCTIONS
// --------------------------------------------------

export function getLocalRegistrations(): LocalRegistrationRecord[] {
  return [];
}

export function saveLocalRegistrations(
  _records: LocalRegistrationRecord[]
): void {
  // No-op: Supabase is the primary store
}

// --------------------------------------------------
// CAPACITY OVERRIDES
// --------------------------------------------------

export function getCapacityOverrides(): Record<string, number> {
  try {
    const raw = localStorage.getItem(
      LOCAL_STORAGE_CAPACITY_OVERRIDES_KEY
    );

    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveEventCapacity(
  eventId: string,
  newCapacity: number
): void {
  try {
    const overrides = getCapacityOverrides();

    overrides[eventId] = newCapacity;

    localStorage.setItem(
      LOCAL_STORAGE_CAPACITY_OVERRIDES_KEY,
      JSON.stringify(overrides)
    );
  } catch (err) {
    console.error(
      'Failed to save capacity override:',
      err
    );
  }
}

export async function updateEventCapacity(
  eventId: string,
  newCapacity: number
): Promise<{
  success: boolean;
  message: string;
}> {
  const cap = Math.max(
    1,
    Math.round(newCapacity)
  );

  saveEventCapacity(eventId, cap);

  const custom = getCustomEvents();

  const idx = custom.findIndex(
    (c) => c.id === eventId
  );

  if (idx !== -1) {
    custom[idx].capacity = cap;
    saveCustomEvents(custom);
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from('events')
        .update({
          capacity: cap,
          updated_at: new Date().toISOString()
        })
        .eq('id', eventId);
    } catch (err) {
      console.warn(
        'Could not update capacity in Supabase:',
        err
      );
    }
  }

  return {
    success: true,
    message: `Event capacity updated to ${cap} seats.`
  };
}

// --------------------------------------------------
// CUSTOM EVENTS
// --------------------------------------------------

export function getCustomEvents(): EventItem[] {
  try {
    const raw = localStorage.getItem(
      LOCAL_STORAGE_CUSTOM_EVENTS_KEY
    );

    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomEvents(
  events: EventItem[]
): void {
  try {
    localStorage.setItem(
      LOCAL_STORAGE_CUSTOM_EVENTS_KEY,
      JSON.stringify(events)
    );
  } catch (err) {
    console.error(
      'Failed to save custom events:',
      err
    );
  }
}

// --------------------------------------------------
// SECURE ACTIVE REGISTRATION COUNT
// --------------------------------------------------
// IMPORTANT:
// Do NOT directly query the registrations table
// for the total count.
//
// The registrations table has RLS, so an attendee
// may only see their own registration.
//
// Instead, use the secure Supabase RPC:
// get_event_active_count()
//
// This gives the real number of active registrations.
// --------------------------------------------------

export async function fetchEventActiveRegistrationsCount(
  eventId: string
): Promise<number> {
  if (!isSupabaseConfigured) {
    return 0;
  }

  try {
    const client =
      await getActiveSupabaseClient();

    const { data, error } =
      await client.rpc(
        'get_event_active_count',
        {
          p_event_id: eventId
        }
      );

    if (error) {
      console.warn(
        'Error fetching active registration count:',
        error.message
      );

      return 0;
    }

    return typeof data === 'number'
      ? data
      : 0;
  } catch (err) {
    console.error(
      'Failed to fetch active registration count:',
      err
    );

    return 0;
  }
}

// --------------------------------------------------
// FETCH ALL EVENTS
// --------------------------------------------------
// This is used by the main Events page.
//
// Every event gets its registration count from
// get_event_active_count().
//
// This prevents RLS from causing incorrect counts.
// --------------------------------------------------

export async function fetchAllEvents(): Promise<EventItem[]> {
  let dbEvents: EventItem[] = [];

  // ------------------------------------------------
  // 1. FETCH EVENTS FROM SUPABASE
  // ------------------------------------------------

  if (isSupabaseConfigured) {
    try {
      const client =
        await getActiveSupabaseClient();

      const { data, error } =
        await client
          .from('events')
          .select('*')
          .order('event_date', {
            ascending: true
          });

      if (!error && data) {
        dbEvents = data;
      }
    } catch (err) {
      console.warn(
        'Could not fetch events from Supabase:',
        err
      );
    }
  }

  // ------------------------------------------------
  // 2. CREATE EVENT MAP
  // ------------------------------------------------

  const eventMap =
    new Map<string, EventItem>();

  // Default events
  for (const defEvent of DEFAULT_EVENTS) {
    eventMap.set(
      defEvent.id,
      {
        ...defEvent
      }
    );
  }

  // Custom local events
  const customEvents =
    getCustomEvents();

  for (const cEvent of customEvents) {
    eventMap.set(
      cEvent.id,
      {
        ...cEvent
      }
    );
  }

  // ------------------------------------------------
  // 3. SUPABASE EVENTS ARE AUTHORITATIVE
  // ------------------------------------------------

  for (const dEvent of dbEvents) {
    const existing =
      eventMap.get(dEvent.id);

    eventMap.set(
      dEvent.id,
      {
        ...existing,
        ...dEvent
      }
    );
  }

  const allEvents =
    Array.from(eventMap.values());

  // ------------------------------------------------
  // 4. GET REAL REGISTRATION COUNT
  // ------------------------------------------------
  //
  // IMPORTANT:
  // We do NOT query registrations directly here.
  //
  // Each event uses the secure RPC.
  // ------------------------------------------------

  const eventsWithCapacity =
    await Promise.all(
      allEvents.map(
        async (evt) => {
          const numericCapacity =
            Number(evt.capacity);

          const capacity =
            Number.isFinite(
              numericCapacity
            ) &&
            numericCapacity > 0
              ? numericCapacity
              : 15;

          // Secure real count
          const activeRegistrations =
            await fetchEventActiveRegistrationsCount(
              evt.id
            );

          // Available seats
          const availableSeats =
            Math.max(
              0,
              capacity -
                activeRegistrations
            );

          // Full status
          const isFull =
            capacity > 0 &&
            activeRegistrations >=
              capacity;

          return {
            ...evt,

            capacity,

            active_registrations_count:
              activeRegistrations,

            available_places:
              availableSeats,

            is_full:
              isFull
          };
        }
      )
    );

  return eventsWithCapacity;
}

// --------------------------------------------------
// FETCH SINGLE EVENT
// --------------------------------------------------

export async function fetchEventById(
  eventId: string
): Promise<EventItem | null> {
  let dbEvent:
    | EventItem
    | null = null;

  // ------------------------------------------------
  // FETCH EVENT
  // ------------------------------------------------

  if (isSupabaseConfigured) {
    try {
      const client =
        await getActiveSupabaseClient();

      const { data, error } =
        await client
          .from('events')
          .select('*')
          .eq('id', eventId)
          .maybeSingle();

      if (!error && data) {
        dbEvent = data;
      }
    } catch (err) {
      console.warn(
        'Could not fetch event:',
        err
      );
    }
  }

  // ------------------------------------------------
  // IF EVENT WAS NOT FOUND
  // ------------------------------------------------

  let baseEvent = dbEvent;

  if (!baseEvent) {
    const all =
      await fetchAllEvents();

    baseEvent =
      all.find(
        (e) => e.id === eventId
      ) || null;
  }

  if (!baseEvent) {
    return null;
  }

  // ------------------------------------------------
  // SECURE REAL REGISTRATION COUNT
  // ------------------------------------------------

  const activeCount =
    await fetchEventActiveRegistrationsCount(
      eventId
    );

  // ------------------------------------------------
  // CAPACITY
  // ------------------------------------------------

  const numericCapacity =
    Number(baseEvent.capacity);

  const capacity =
    Number.isFinite(
      numericCapacity
    ) &&
    numericCapacity > 0
      ? numericCapacity
      : 15;

  const availableSeats =
    Math.max(
      0,
      capacity -
        activeCount
    );

  const isFull =
    capacity > 0 &&
    activeCount >=
      capacity;

  return {
    ...baseEvent,

    capacity,

    active_registrations_count:
      activeCount,

    available_places:
      availableSeats,

    is_full:
      isFull
  };
}

// --------------------------------------------------
// BROADCAST CAPACITY CHANGE
// --------------------------------------------------

export function broadcastCapacityChange(
  eventId: string
): void {
  try {
    const channel =
      supabase.channel(
        'event-capacity-sync'
      );

    channel.send({
      type: 'broadcast',
      event: 'registration_update',

      payload: {
        eventId,
        timestamp: Date.now()
      }
    });
  } catch {
    // Non-blocking broadcast
  }
}

// --------------------------------------------------
// REGISTER ATTENDEE
// --------------------------------------------------

export async function registerAttendeeForEvent({
  eventId,
  userId,
  userEmail,
  userName
}: {
  eventId: string;
  userId: string;
  userEmail: string;
  userName: string;
}): Promise<{
  success: boolean;
  message: string;
  ticketCode?: string;
  seatNumber?: number;
}> {
  const event =
    await fetchEventById(eventId);

  if (!event) {
    return {
      success: false,
      message: 'Event not found.'
    };
  }

  // ------------------------------------------------
  // CHECK CAPACITY
  // ------------------------------------------------

  if (
    (
      event.available_places !==
        undefined &&
      event.available_places <= 0
    ) ||
    (
      event.capacity > 0 &&
      (
        event.active_registrations_count ??
        0
      ) >= event.capacity
    )
  ) {
    return {
      success: false,
      message:
        'This event is full. No seats are available.'
    };
  }

  // ------------------------------------------------
  // REGISTER THROUGH SECURE RPC
  // ------------------------------------------------

  if (isSupabaseConfigured) {
    const rpcRes =
      await rpcRegisterForEvent(
        eventId
      );

    if (!rpcRes.success) {
      return {
        success: false,
        message:
          formatRpcError(
            rpcRes.message
          )
      };
    }
  }

  // ------------------------------------------------
  // BROADCAST UPDATE
  // ------------------------------------------------

  broadcastCapacityChange(
    eventId
  );

  // ------------------------------------------------
  // ASSIGN SEAT
  // ------------------------------------------------

  const currentActive =
    event.active_registrations_count ??
    0;

  const assignedSeatNumber =
    Math.min(
      event.capacity,
      currentActive + 1
    );

  // ------------------------------------------------
  // GENERATE TICKET
  // ------------------------------------------------

  const randomDigits =
    Math.floor(
      1000 +
        Math.random() *
          9000
    );

  const prefix =
    event.title
      .toLowerCase()
      .includes('web')
      ? 'WEB'
      : 'NOW';

  const ticketCode =
    `TKT-${prefix}-${randomDigits}`;

  return {
    success: true,

    message:
      `Registration successful! Seat #${assignedSeatNumber} (Ticket #${ticketCode}) is confirmed for ${event.title}.`,

    ticketCode,

    seatNumber:
      assignedSeatNumber
  };
}

// --------------------------------------------------
// FETCH USER REGISTRATIONS
// --------------------------------------------------

export async function fetchUserRegistrations(
  userId?: string,
  _userEmail?: string
): Promise<Registration[]> {
  if (
    !isSupabaseConfigured ||
    !userId
  ) {
    return [];
  }

  try {
    const { data, error } =
      await supabase
        .from('registrations')
        .select(`
          id,
          user_id,
          event_id,
          status,
          created_at,
          updated_at,
          event:events (*)
        `)
        .eq(
          'user_id',
          userId
        )
        .order(
          'created_at',
          {
            ascending: false
          }
        );

    if (
      error ||
      !data
    ) {
      return [];
    }

    // ------------------------------------------------
    // GET REGISTRATIONS FOR SEAT NUMBER CALCULATION
    // ------------------------------------------------

    let allRegs: {
      id: string;
      event_id: string;
      status: string;
      created_at: string;
    }[] = [];

    try {
      const client =
        await getActiveSupabaseClient();

      const {
        data: fullRegs
      } = await client
        .from('registrations')
        .select(
          'id, event_id, status, created_at'
        )
        .order(
          'created_at',
          {
            ascending: true
          }
        );

      if (fullRegs) {
        allRegs = fullRegs;
      }
    } catch {
      // Fallback
    }

    // ------------------------------------------------
    // BUILD USER REGISTRATIONS
    // ------------------------------------------------

    return data.map(
      (item: any) => {
        let seat_number:
          | number
          | undefined =
          undefined;

        if (
          item.status ===
          'active'
        ) {
          const activeForEvent =
            allRegs
              .filter(
                (r) =>
                  r.event_id ===
                    item.event_id &&
                  r.status ===
                    'active'
              )
              .sort(
                (a, b) =>
                  new Date(
                    a.created_at
                  ).getTime() -
                  new Date(
                    b.created_at
                  ).getTime()
              );

          const idx =
            activeForEvent.findIndex(
              (r) =>
                r.id ===
                item.id
            );

          if (idx !== -1) {
            seat_number =
              idx + 1;
          } else {
            seat_number =
              1;
          }
        }

        return {
          id: item.id,
          user_id:
            item.user_id,
          event_id:
            item.event_id,
          status:
            item.status,
          created_at:
            item.created_at,
          updated_at:
            item.updated_at,
          event:
            Array.isArray(
              item.event
            )
              ? item.event[0]
              : item.event,
          seat_number
        };
      }
    );
  } catch (err) {
    console.error(
      'Failed to fetch registrations from Supabase:',
      err
    );

    return [];
  }
}

// --------------------------------------------------
// CANCEL REGISTRATION
// --------------------------------------------------

export async function cancelRegistration(
  registrationId: string,
  eventId?: string
): Promise<{
  success: boolean;
  message: string;
}> {
  if (isSupabaseConfigured) {
    const res =
      await rpcCancelRegistration(
        registrationId
      );

    if (!res.success) {
      return {
        success: false,
        message:
          formatRpcError(
            res.message
          )
      };
    }
  }

  if (eventId) {
    broadcastCapacityChange(
      eventId
    );
  }

  return {
    success: true,
    message:
      'Your registration has been cancelled. Your seat is now released.'
  };
}