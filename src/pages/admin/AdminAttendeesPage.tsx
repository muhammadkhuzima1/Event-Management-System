import React, { useEffect, useState } from 'react';

import {
  ArrowLeft,
  Users,
  Search,
  Download,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  MapPin,
  AlertCircle,
  Armchair,
  UserRound,
  Mail,
  Ban
} from 'lucide-react';

import {
  supabase,
  isSupabaseConfigured
} from '../../lib/supabase';

import {
  EventItem,
  AttendeeRecord,
  RegistrationStatus
} from '../../types/database';

import {
  LoadingSpinner
} from '../../components/common/LoadingSpinner';

import {
  ConfigNotice
} from '../../components/common/ConfigNotice';

import {
  useToast
} from '../../context/ToastContext';

import {
  fetchEventById,
  getLocalRegistrations
} from '../../lib/eventsStore';

import {
  SeatGrid
} from '../../components/events/SeatGrid';

interface AdminAttendeesPageProps {
  eventId: string;
  navigate: (path: string) => void;
}

export const AdminAttendeesPage: React.FC<
  AdminAttendeesPageProps
> = ({
  eventId,
  navigate
}) => {

  const {
    error: toastError,
    info
  } = useToast();

  const [event, setEvent] =
    useState<EventItem | null>(null);

  const [attendees, setAttendees] =
    useState<AttendeeRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [searchQuery, setSearchQuery] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<string>('all');

  const [cancellingId, setCancellingId] =
    useState<string | null>(null);


  // =====================================================
  // FETCH EVENT + ATTENDEES
  // =====================================================

  const fetchEventAndAttendees =
    async () => {

      try {

        setLoading(true);

        // -----------------------------------------------
        // 1. FETCH EVENT
        // -----------------------------------------------

        const foundEvent =
          await fetchEventById(eventId);

        if (!foundEvent) {

          setEvent(null);

          return;
        }

        setEvent(foundEvent);


        const records:
          AttendeeRecord[] = [];


        // -----------------------------------------------
        // 2. LOCAL REGISTRATIONS
        // -----------------------------------------------

        const localRegs =
          getLocalRegistrations()
            .filter(
              (r) =>
                r.event_id === eventId
            );


        for (const loc of localRegs) {

          records.push({

            registration_id:
              loc.id,

            user_id:
              loc.user_id,

            full_name:
              loc.user_name ||
              'Attendee',

            email:
              loc.user_email ||
              'N/A',

            status:
              loc.status as RegistrationStatus,

            created_at:
              loc.created_at
          });
        }


        // -----------------------------------------------
        // 3. SUPABASE REGISTRATIONS
        // -----------------------------------------------

        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
            .test(eventId);


        if (
          isSupabaseConfigured &&
          isUuid
        ) {

          const {
            data: regData,
            error: regError
          } = await supabase

            .from('registrations')

            .select(
              'id, user_id, status, created_at'
            )

            .eq(
              'event_id',
              eventId
            )

            .order(
              'created_at',
              {
                ascending: true
              }
            );


          if (regError) {

            console.error(
              'Registration fetch error:',
              regError
            );

          }


          if (
            regData &&
            regData.length > 0
          ) {

            // -----------------------------------------
            // GET USER IDS
            // -----------------------------------------

            const userIds =
              Array.from(
                new Set(
                  regData.map(
                    (r) => r.user_id
                  )
                )
              );


            // -----------------------------------------
            // GET PROFILES
            // -----------------------------------------

            const {
              data: profilesData,
              error: profilesError
            } = await supabase

              .from('profiles')

              .select(
                'id, full_name, email'
              )

              .in(
                'id',
                userIds
              );


            if (profilesError) {

              console.error(
                'Profile fetch error:',
                profilesError
              );

            }


            // -----------------------------------------
            // CREATE PROFILE MAP
            // -----------------------------------------

            const profileMap:
              Record<
                string,
                {
                  full_name: string;
                  email: string;
                }
              > = {};


            profilesData?.forEach(
              (profile) => {

                profileMap[
                  profile.id
                ] = {

                  full_name:
                    profile.full_name ||
                    'Attendee',

                  email:
                    profile.email ||
                    'N/A'
                };

              }
            );


            // -----------------------------------------
            // CREATE ATTENDEE RECORDS
            // -----------------------------------------

            regData.forEach(
              (registration) => {

                const alreadyExists =
                  records.some(
                    (record) =>
                      record.registration_id ===
                      registration.id
                  );


                if (
                  alreadyExists
                ) {

                  return;
                }


                const profile =
                  profileMap[
                    registration.user_id
                  ];


                records.push({

                  registration_id:
                    registration.id,

                  user_id:
                    registration.user_id,

                  full_name:
                    profile?.full_name ||
                    'Attendee',

                  email:
                    profile?.email ||
                    'N/A',

                  status:
                    registration.status as RegistrationStatus,

                  created_at:
                    registration.created_at
                });

              }
            );
          }
        }


        // -----------------------------------------------
        // 4. ASSIGN SEAT NUMBERS
        // -----------------------------------------------

        const activeSorted =
          records

            .filter(
              (record) =>
                record.status ===
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


        activeSorted.forEach(
          (record, index) => {

            record.seat_number =
              index + 1;

          }
        );


        // -----------------------------------------------
        // 5. SAVE ATTENDEES
        // -----------------------------------------------

        setAttendees(
          records
        );

      } catch (error) {

        console.error(
          'Failed to load attendee roster:',
          error
        );

        toastError(
          'Failed to load attendee list.'
        );

      } finally {

        setLoading(false);

      }
    };


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    fetchEventAndAttendees();

  }, [eventId]);


  // =====================================================
  // COUNTS
  // =====================================================

  const activeCount =
    attendees.filter(
      (attendee) =>
        attendee.status ===
        'active'
    ).length;


  const cancelledCount =
    attendees.filter(
      (attendee) =>
        attendee.status ===
        'cancelled'
    ).length;


  const capacity =
    event?.capacity || 0;


  const available =
    Math.max(
      0,
      capacity -
        activeCount
    );


  // =====================================================
  // SEARCH + STATUS FILTER
  // =====================================================

  const normalizedSearch =
    searchQuery
      .trim()
      .toLowerCase();


  const filteredAttendees =
    attendees.filter(
      (attendee) => {

        const matchesStatus =
          statusFilter ===
            'all' ||
          attendee.status ===
            statusFilter;


        const matchesSearch =
          !normalizedSearch ||
          attendee.full_name
            .toLowerCase()
            .includes(
              normalizedSearch
            ) ||
          attendee.email
            .toLowerCase()
            .includes(
              normalizedSearch
            ) ||
          attendee.registration_id
            .toLowerCase()
            .includes(
              normalizedSearch
            );


        return (
          matchesStatus &&
          matchesSearch
        );
      }
    );


  // =====================================================
  // ADMIN CANCEL REGISTRATION
  // =====================================================

  const handleAdminCancel =
    async (
      registrationId: string,
      attendeeName: string
    ) => {

      const confirmed =
        window.confirm(
          `Cancel registration for ${attendeeName}?`
        );


      if (!confirmed) {

        return;
      }


      try {

        setCancellingId(
          registrationId
        );


        // ---------------------------------------------
        // CALL SECURE ADMIN RPC
        // ---------------------------------------------

        const {
          data,
          error
        } = await supabase.rpc(
          'admin_cancel_registration',
          {
            p_registration_id:
              registrationId
          }
        );


        if (error) {

          console.error(
            'Admin cancellation error:',
            error
          );

          toastError(
            error.message ||
            'Could not cancel registration.'
          );

          return;
        }


        if (data !== true) {

          toastError(
            'Registration was not active or could not be cancelled.'
          );

          return;
        }


        // ---------------------------------------------
        // SUCCESS
        // ---------------------------------------------

        info(
          `${attendeeName}'s registration was cancelled.`
        );


        // ---------------------------------------------
        // RELOAD DATA
        // ---------------------------------------------

        await fetchEventAndAttendees();

      } catch (error) {

        console.error(
          'Admin cancellation failed:',
          error
        );

        toastError(
          'Could not cancel registration.'
        );

      } finally {

        setCancellingId(
          null
        );
      }
    };


  // =====================================================
  // EXPORT CSV
  // =====================================================

  const handleExportCSV =
    () => {

      if (
        filteredAttendees.length ===
        0
      ) {

        info(
          'No attendee records to export.'
        );

        return;
      }


      const headers = [
        'Registration ID',
        'Full Name',
        'Email',
        'Registration Status',
        'Seat Number',
        'Registration Date'
      ];


      const rows =
        filteredAttendees.map(
          (attendee) => [

            attendee.registration_id,

            `"${attendee.full_name.replace(
              /"/g,
              '""'
            )}"`,

            `"${attendee.email.replace(
              /"/g,
              '""'
            )}"`,

            attendee.status,

            attendee.seat_number
              ? attendee.seat_number
              : '',

            `"${new Date(
              attendee.created_at
            ).toLocaleString()}"`
          ]
        );


      const csvContent =
        'data:text/csv;charset=utf-8,' +
        [
          headers.join(','),
          ...rows.map(
            (row) =>
              row.join(',')
          )
        ].join('\n');


      const encodedUri =
        encodeURI(
          csvContent
        );


      const link =
        document.createElement(
          'a'
        );


      link.setAttribute(
        'href',
        encodedUri
      );


      link.setAttribute(
        'download',
        `attendees-${
          event?.title
            .toLowerCase()
            .replace(
              /[^a-z0-9]/g,
              '-'
            ) ||
          'roster'
        }.csv`
      );


      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );


      info(
        `Exported ${filteredAttendees.length} attendee records.`
      );
    };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (
      <LoadingSpinner
        label="Loading attendee roster..."
        fullPage
      />
    );
  }


  // =====================================================
  // EVENT NOT FOUND
  // =====================================================

  if (!event) {

    return (

      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">

        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />

        <h2 className="text-2xl font-bold text-white">
          Event Not Found
        </h2>

        <p className="text-slate-400 text-sm">
          Cannot display attendees for an event that does not exist.
        </p>

        <button
          onClick={() =>
            navigate(
              '/admin/events'
            )
          }
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider"
        >
          Return to Events
        </button>

      </div>
    );
  }


  // =====================================================
  // PAGE
  // =====================================================

  return (

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {!isSupabaseConfigured && (
        <ConfigNotice />
      )}


      {/* BACK */}

      <button
        onClick={() =>
          navigate(
            '/admin/events'
          )
        }
        className="inline-flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-indigo-400 transition-colors uppercase tracking-wider"
      >

        <ArrowLeft className="w-4 h-4" />

        <span>
          Back to Events Management
        </span>

      </button>


      {/* HEADER */}

      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">

          <div className="space-y-2">

            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">

              <Users className="w-3.5 h-3.5" />

              <span>
                Attendee Roster & Management
              </span>

            </div>


            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">

              {event.title}

            </h1>


            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono pt-1">

              <div className="flex items-center gap-1.5 text-slate-300">

                <Calendar className="w-3.5 h-3.5 text-indigo-400" />

                <span>
                  {new Date(
                    event.event_date
                  ).toLocaleDateString()}
                </span>

              </div>


              <div className="flex items-center gap-1.5 text-slate-300">

                <Clock className="w-3.5 h-3.5 text-indigo-400" />

                <span>
                  {event.event_time}
                </span>

              </div>


              <div className="flex items-center gap-1.5 text-slate-300">

                <MapPin className="w-3.5 h-3.5 text-indigo-400" />

                <span>
                  {event.location}
                </span>

              </div>

            </div>

          </div>


          {/* ACTIONS */}

          <div className="flex flex-wrap items-center gap-3">

            <button
              onClick={
                fetchEventAndAttendees
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >

              <RefreshCw className="w-3.5 h-3.5" />

              <span>
                Refresh
              </span>

            </button>


            <button
              onClick={
                handleExportCSV
              }
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all"
            >

              <Download className="w-4 h-4" />

              <span>
                Export CSV
              </span>

            </button>

          </div>

        </div>


        {/* STATS */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">

          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">

            <span className="text-[11px] font-mono text-slate-400 uppercase">
              Max Capacity
            </span>

            <p className="text-xl font-bold text-white font-mono">
              {capacity}
            </p>

          </div>


          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">

            <span className="text-[11px] font-mono text-emerald-400 uppercase">
              Active Bookings
            </span>

            <p className="text-xl font-bold text-emerald-400 font-mono">
              {activeCount}
            </p>

          </div>


          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">

            <span className="text-[11px] font-mono text-cyan-400 uppercase">
              Remaining Seats
            </span>

            <p className="text-xl font-bold text-cyan-400 font-mono">
              {available}
            </p>

          </div>


          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">

            <span className="text-[11px] font-mono text-slate-400 uppercase">
              Cancelled
            </span>

            <p className="text-xl font-bold text-slate-400 font-mono">
              {cancelledCount}
            </p>

          </div>

        </div>

      </div>


      {/* SEAT GRID */}

      <SeatGrid
        eventId={eventId}
        capacity={capacity}
        activeCount={activeCount}
        isAdmin={true}
        onCapacityChange={
          fetchEventAndAttendees
        }
      />


      {/* SEARCH */}

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

        <div className="relative w-full sm:w-96">

          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />

          <input
            id="input-search-attendees"
            type="text"
            placeholder="Search name, email or registration ID..."
            value={searchQuery}
            onChange={(e) =>
              setSearchQuery(
                e.target.value
              )
            }
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />

        </div>


        <div className="flex items-center gap-2 w-full sm:w-auto">

          {[
            'all',
            'active',
            'cancelled'
          ].map(
            (status) => (

              <button
                key={status}
                onClick={() =>
                  setStatusFilter(
                    status
                  )
                }
                className={`px-3 py-1.5 rounded-xl text-xs font-medium font-mono uppercase transition-colors ${
                  statusFilter ===
                  status
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >

                {status}

              </button>

            )
          )}

        </div>

      </div>


      {/* SEARCH RESULT COUNT */}

      <div className="flex items-center justify-between text-xs font-mono text-slate-500">

        <span>
          Showing{' '}
          <strong className="text-slate-300">
            {filteredAttendees.length}
          </strong>{' '}
          of{' '}
          <strong className="text-slate-300">
            {attendees.length}
          </strong>{' '}
          registration records
        </span>

        {searchQuery && (
          <span>
            Search:
            <strong className="text-indigo-400 ml-1">
              {searchQuery}
            </strong>
          </span>
        )}

      </div>


      {/* ATTENDEE TABLE */}

      <div className="bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">

        {filteredAttendees.length === 0 ? (

          <div className="p-12 text-center text-slate-400 space-y-2">

            <Users className="w-8 h-8 mx-auto text-slate-600" />

            <p className="text-sm">
              No attendees match the criteria.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full text-left border-collapse">

              <thead>

                <tr className="border-b border-slate-800 bg-slate-950/50 text-[11px] font-mono uppercase tracking-wider text-slate-400">

                  <th className="py-4 px-6">
                    Assigned Seat
                  </th>

                  <th className="py-4 px-6">
                    Attendee
                  </th>

                  <th className="py-4 px-6">
                    Email Address
                  </th>

                  <th className="py-4 px-6">
                    Status
                  </th>

                  <th className="py-4 px-6">
                    Registration Time
                  </th>

                  <th className="py-4 px-6 text-right">
                    Action
                  </th>

                </tr>

              </thead>


              <tbody className="divide-y divide-slate-800/60 text-sm">

                {filteredAttendees.map(
                  (attendee) => (

                    <tr
                      key={
                        attendee.registration_id
                      }
                      className="hover:bg-slate-800/30 transition-colors"
                    >

                      {/* SEAT */}

                      <td className="py-4 px-6">

                        {attendee.status ===
                          'active' &&
                        attendee.seat_number ? (

                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">

                            <Armchair className="w-3.5 h-3.5 text-cyan-400" />

                            <span>
                              Seat #
                              {attendee.seat_number <
                              10
                                ? `0${attendee.seat_number}`
                                : attendee.seat_number}
                            </span>

                          </span>

                        ) : (

                          <span className="text-slate-600 text-xs font-mono">
                            -
                          </span>

                        )}

                      </td>


                      {/* NAME */}

                      <td className="py-4 px-6">

                        <div className="flex items-center gap-3">

                          <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">

                            <UserRound className="w-4 h-4 text-indigo-400" />

                          </div>

                          <div>

                            <div className="font-semibold text-white">

                              {attendee.full_name}

                            </div>

                            <div className="text-[10px] font-mono text-slate-500">

                              ID:
                              {' '}
                              {attendee.registration_id}

                            </div>

                          </div>

                        </div>

                      </td>


                      {/* EMAIL */}

                      <td className="py-4 px-6">

                        <div className="flex items-center gap-2 text-slate-300">

                          <Mail className="w-3.5 h-3.5 text-slate-500" />

                          <span className="font-mono text-xs">

                            {attendee.email}

                          </span>

                        </div>

                      </td>


                      {/* STATUS */}

                      <td className="py-4 px-6">

                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                            attendee.status ===
                            'active'
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >

                          {attendee.status ===
                          'active' ? (

                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </>

                          ) : (

                            <>
                              <XCircle className="w-3 h-3" />
                              Cancelled
                            </>

                          )}

                        </span>

                      </td>


                      {/* DATE */}

                      <td className="py-4 px-6 text-xs text-slate-400 font-mono">

                        {new Date(
                          attendee.created_at
                        ).toLocaleString()}

                      </td>


                      {/* ACTION */}

                      <td className="py-4 px-6 text-right">

                        {attendee.status ===
                        'active' ? (

                          <button
                            onClick={() =>
                              handleAdminCancel(
                                attendee.registration_id,
                                attendee.full_name
                              )
                            }
                            disabled={
                              cancellingId ===
                              attendee.registration_id
                            }
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
                          >

                            {cancellingId ===
                            attendee.registration_id ? (

                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                Cancelling...
                              </>

                            ) : (

                              <>
                                <Ban className="w-3.5 h-3.5" />
                                Cancel
                              </>

                            )}

                          </button>

                        ) : (

                          <span className="text-xs text-slate-600 font-mono">
                            Cancelled
                          </span>

                        )}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
};