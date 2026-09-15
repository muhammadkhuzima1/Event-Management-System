export type UserRole = 'admin' | 'attendee';

export type EventStatus = 'draft' | 'published' | 'completed' | 'cancelled';

export type RegistrationStatus = 'active' | 'cancelled';

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  created_at: string;
  updated_at?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string;
  capacity: number;
  status: EventStatus;
  created_at: string;
  updated_at?: string;
  // Augmented client-side fields computed from database queries
  active_registrations_count?: number;
  available_places?: number;
  is_full?: boolean;
  user_registration?: Registration | null;
}

export interface Registration {
  id: string;
  user_id: string;
  event_id: string;
  status: RegistrationStatus;
  created_at: string;
  updated_at?: string;
  event?: EventItem;
  profile?: Profile;
  seat_number?: number;
}

export interface AttendeeRecord {
  registration_id: string;
  user_id: string;
  full_name: string;
  email: string;
  status: RegistrationStatus;
  created_at: string;
  seat_number?: number;
}

export interface AdminStats {
  totalEvents: number;
  publishedEvents: number;
  upcomingEvents: number;
  totalRegistrations: number;
  activeRegistrations: number;
  totalCapacity: number;
  remainingCapacity: number;
}
