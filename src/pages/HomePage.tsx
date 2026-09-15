import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Calendar, 
  Users, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  TrendingUp,
  Ticket,
  Code2,
  Camera,
  Layers
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { EventItem } from '../types/database';
import { EventCard } from '../components/events/EventCard';
import { ConfigNotice } from '../components/common/ConfigNotice';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { fetchAllEvents } from '../lib/eventsStore';
import { 
  heroWorkshopImg, 
  pythonSessionImg, 
  innovationHallImg, 
  networkingImg, 
  EVENT_PHOTOS 
} from '../assets/eventImages';

interface HomePageProps {
  navigate: (path: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ navigate }) => {
  const { user, isAdmin } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeatured() {
      try {
        setLoading(true);
        const all = await fetchAllEvents();
        const published = all.filter((e) => e.status === 'published');
        setFeaturedEvents(published.slice(0, 3));
      } catch (err) {
        console.error('Failed to load featured events:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFeatured();
  }, []);

  return (
    <div className="space-y-24 pb-24 bg-slate-950 text-slate-100">
      {!isSupabaseConfigured && <ConfigNotice />}

      {/* Hero Section with Cinematic Dark Photography */}
      <section className="relative overflow-hidden pt-16 md:pt-28 pb-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80">
        {/* Background Photo with layered dark gradient masks */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src={heroWorkshopImg}
            alt="Nowshera Tech Seminar Audience"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center opacity-25 scale-105 filter blur-[1px]"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950/85 to-slate-950" />
          <div className="absolute inset-0 bg-radial from-emerald-500/10 via-transparent to-slate-950/90" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium tracking-wide shadow-lg shadow-emerald-950/30 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Nowshera Events Co. • Official Technology & Learning Platform</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08]">
            Connect. Learn. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-sm">
              Build Together.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Discover technical workshops, coding bootcamps, and executive seminars in Nowshera.
            Experience guaranteed seat allocations with live concurrency-safe capacity tracking.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              id="hero-btn-explore-events"
              onClick={() => navigate('/events')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-xl shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Explore Workshops</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {!user ? (
              <button
                id="hero-btn-signup"
                onClick={() => navigate('/signup')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <span>Join as Attendee</span>
              </button>
            ) : isAdmin ? (
              <button
                id="hero-btn-admin-dashboard"
                onClick={() => navigate('/admin')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
              >
                <span>Admin Management Hub</span>
              </button>
            ) : (
              <button
                id="hero-btn-my-registrations"
                onClick={() => navigate('/my-registrations')}
                className="w-full sm:w-auto px-8 py-4 rounded-xl text-sm font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-all flex items-center justify-center gap-2 backdrop-blur-sm"
              >
                <Ticket className="w-4 h-4 text-emerald-400" />
                <span>My Registered Seats</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <span className="text-xs font-mono text-emerald-400 block">Workshops</span>
              <span className="text-lg font-bold text-white">Interactive Labs</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <span className="text-xs font-mono text-emerald-400 block">Capacity</span>
              <span className="text-lg font-bold text-white">Live Locking</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <span className="text-xs font-mono text-emerald-400 block">Hub Venue</span>
              <span className="text-lg font-bold text-white">Hall A & Labs</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
              <span className="text-xs font-mono text-emerald-400 block">Community</span>
              <span className="text-lg font-bold text-white">100% Free Entry</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Impressions / Curated Photography Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
              <Camera className="w-3.5 h-3.5" />
              <span>Campus & Community Gallery</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Spaces, Labs & Learning Environment
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              Take a visual tour inside our workshop venues, coding stations, and collaborative networking gatherings.
            </p>
          </div>
        </div>

        {/* 4 Photo Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {EVENT_PHOTOS.map((photo) => (
            <div
              key={photo.id}
              className="group rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/40 backdrop-blur-md"
            >
              <div className="relative h-48 w-full overflow-hidden bg-slate-950">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out opacity-90 group-hover:opacity-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30" />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase bg-slate-950/80 text-emerald-300 border border-slate-700/80 backdrop-blur-md">
                  {photo.category}
                </span>
              </div>

              <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                    {photo.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                    {photo.caption}
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Nowshera Hub</span>
                  <span className="text-emerald-400 font-medium">Verified Facility</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Value Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-6">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Verified Events</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Curated workshops, technical training, and community gatherings hosted by recognized organizers across Nowshera.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-400 flex items-center justify-center mb-6">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Automated Capacity</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Never worry about overbooking. Every seat is reserved via atomic database functions preventing double registrations.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 transition-colors backdrop-blur-md">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mb-6">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Instant Confirmation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Direct registration confirmation without waiting for WhatsApp group approvals or manual spreadsheet checks.
            </p>
          </div>
        </div>
      </section>

      {/* Featured Upcoming Events with Rich Photography */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold mb-1">
              Explore Lineup
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Upcoming Workshops & Seminars</h2>
          </div>
          <button
            onClick={() => navigate('/events')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <span>View All Events</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <LoadingSpinner label="Loading upcoming events..." />
        ) : featuredEvents.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-6">
            {featuredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onSelect={(id) => navigate(`/events/${id}`)}
              />
            ))}
          </div>
        ) : (
          /* Rich Editorial Card for Python Workshop Spotlight */
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 overflow-hidden shadow-2xl transition-all backdrop-blur-md">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Photo on left side */}
              <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-full bg-slate-950 overflow-hidden">
                <img
                  src={pythonSessionImg}
                  alt="Python Coding Workshop Session"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90 hover:scale-105 transition-transform duration-500 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-slate-900/90 via-transparent to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
                    Featured Workshop
                  </span>
                </div>
              </div>

              {/* Information on right side */}
              <div className="lg:col-span-7 p-6 sm:p-10 space-y-6 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                      Nowshera Tech Hub
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-mono text-slate-400 bg-slate-800/60 border border-slate-700/60">
                      Capacity: 45 Attendees
                    </span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Python for Beginners & Data Automation Workshop
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    An intensive, hands-on workshop covering foundational Python programming, practical automation scripts,
                    pandas data workflows, and engineering problem-solving inside Hall A.
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800/80">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5">
                      <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200">Upcoming Session</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200">10:00 AM - 01:00 PM</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-slate-200 truncate">Hall A, Innovation Hub</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <span className="text-xs text-slate-400">
                      Includes certificate of participation and mentor support.
                    </span>

                    <button
                      id="btn-home-view-python"
                      onClick={() => navigate('/events')}
                      className="px-6 py-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
                    >
                      <span>Explore & Register</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
