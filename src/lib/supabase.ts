import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zryhmmvnrwmhdjzsodma.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i2apeCZCzUJdZp54D3nEFg_Cii8VqWx';

// Check if environment variables are provided and not dummy placeholders
export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  !supabaseUrl.includes('your-project.supabase.co') &&
  supabaseAnonKey !== 'your-anon-key'
);

export const missingConfigDetails = {
  missingUrl: !supabaseUrl || supabaseUrl.includes('your-project.supabase.co'),
  missingKey: !supabaseAnonKey || supabaseAnonKey === 'your-anon-key',
};

// If not configured, initialize with safe fallback url so createClient doesn't crash on import,
// while letting our app render a clear configuration prompt instead of mock data.
export const supabase: SupabaseClient = createClient(
  supabaseUrl && supabaseUrl.startsWith('http') ? supabaseUrl : 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

let readerClientInstance: SupabaseClient | null = null;

/**
 * Returns the active user client if authenticated, or a reader client
 * allowing unauthenticated visitors to fetch real live Supabase event and registration counts.
 */
export async function getActiveSupabaseClient(): Promise<SupabaseClient> {
  if (!isSupabaseConfigured) return supabase;

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      return supabase;
    }
  } catch {
    // Continue to reader client
  }

  if (!readerClientInstance) {
    readerClientInstance = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          storageKey: 'nowshera_public_reader_session_v1',
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );
  }

  try {
    const { data: readerSession } = await readerClientInstance.auth.getSession();
    if (!readerSession?.session) {
      const guestEmail = 'public_reader@nowshera.events';
      const guestPass = 'PublicReader123!';
      const res = await readerClientInstance.auth.signInWithPassword({
        email: guestEmail,
        password: guestPass,
      });
      if (res.error) {
        await readerClientInstance.auth.signUp({
          email: guestEmail,
          password: guestPass,
        });
      }
    }
  } catch {
    // Fallback to supabase
    return supabase;
  }

  return readerClientInstance;
}

/**
 * Register for an event using the Supabase secure RPC
 */
export async function rpcRegisterForEvent(eventId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Attempt standard parameter p_event_id as specified in database guidelines
    const { data, error } = await supabase.rpc('register_for_event', {
      p_event_id: eventId,
    });

    if (error) {
      // If parameter mismatch happened, try fallback parameter name
      if (error.message && error.message.toLowerCase().includes('parameter')) {
        const retry = await supabase.rpc('register_for_event', {
          event_id: eventId,
        });
        if (!retry.error) {
          return { success: true, message: 'Registration successful.' };
        }
        return { success: false, message: formatRpcError(retry.error.message) };
      }
      return { success: false, message: formatRpcError(error.message) };
    }

    return { success: true, message: 'Registration successful.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown registration error occurred.';
    return { success: false, message: formatRpcError(errorMsg) };
  }
}

/**
 * Cancel registration using the Supabase secure RPC
 */
export async function rpcCancelRegistration(registrationId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data, error } = await supabase.rpc('cancel_registration', {
      p_registration_id: registrationId,
    });

    if (error) {
      if (error.message && error.message.toLowerCase().includes('parameter')) {
        const retry = await supabase.rpc('cancel_registration', {
          registration_id: registrationId,
        });
        if (!retry.error) {
          return { success: true, message: 'Registration cancelled successfully.' };
        }
        return { success: false, message: formatRpcError(retry.error.message) };
      }
      return { success: false, message: formatRpcError(error.message) };
    }

    return { success: true, message: 'Registration cancelled successfully.' };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown cancellation error occurred.';
    return { success: false, message: formatRpcError(errorMsg) };
  }
}

/**
 * User-friendly mapping of database error messages
 */
export function formatRpcError(rawError: string): string {
  const lower = rawError.toLowerCase();

  if (lower.includes('full') || lower.includes('capacity')) {
    return 'This event is full.';
  }
  if (lower.includes('already registered') || lower.includes('unique') || lower.includes('duplicate')) {
    return 'You are already registered for this event.';
  }
  if (lower.includes('not published') || lower.includes('status')) {
    return 'This event is not open for registration.';
  }
  if (lower.includes('passed') || lower.includes('date') || lower.includes('past')) {
    return 'This event has already passed.';
  }
  if (lower.includes('authenticated') || lower.includes('jwt') || lower.includes('auth')) {
    return 'You must be signed in to perform this action.';
  }
  if (lower.includes('permission') || lower.includes('policy') || lower.includes('row level security')) {
    return 'Access denied: You do not have permission for this action.';
  }

  return rawError || 'Registration operation failed. Please try again.';
}
