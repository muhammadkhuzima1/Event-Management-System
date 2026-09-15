import React from 'react';
import { Calendar, Clock, MapPin, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { EventItem } from '../../types/database';
import { getEventCoverImage } from '../../assets/eventImages';

interface EventCardProps {
  event: EventItem;
  onSelect: (id: string) => void;
  isRegistered?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect, isRegistered }) => {
  const activeCount = event.active_registrations_count ?? 0;
  const capacity = event.capacity || 0;
  const available = Math.max(0, capacity - activeCount);
  const isFull = capacity > 0 && available === 0;
  const coverImage = getEventCoverImage(event.title, event.description);

  // Format date nicely
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

  return (
    <div
      id={`event-card-${event.id}`}
      className="group bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-950/40 flex flex-col justify-between backdrop-blur-md"
    >
      <div>
        {/* Cover Photo */}
        <div className="relative h-44 w-full overflow-hidden bg-slate-950">
          <img
            src={coverImage}
            alt={event.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out opacity-90 group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-black/40" />

          {/* Overlaid Badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tracking-wide uppercase backdrop-blur-md shadow-md ${
                event.status === 'published'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : event.status === 'completed'
                  ? 'bg-slate-800/80 text-slate-300 border border-slate-700'
                  : event.status === 'cancelled'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {event.status}
            </span>

            {isRegistered ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-500/20 text-cyan-200 border border-cyan-500/40 flex items-center gap-1 backdrop-blur-md shadow-md">
                <CheckCircle2 className="w-3 h-3" /> Registered
              </span>
            ) : (
              <span
                className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full backdrop-blur-md shadow-md ${
                  isFull
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : available <= 5
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isFull ? 'Event Full (0 Seats)' : `${available} of ${capacity} Seats Left`}
              </span>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-3">
          {/* Title */}
          <h3 className="text-lg font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
            {event.title}
          </h3>

          {/* Short Description */}
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {event.description || 'No description provided.'}
          </p>

          {/* Details Grid */}
          <div className="space-y-2 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{event.event_time}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Total: <strong className="text-slate-200">{capacity}</strong> · Reserved: <strong className="text-slate-300">{activeCount}</strong> · Available: <strong className="text-emerald-400">{available}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-2 border-t border-slate-800/80 flex items-center justify-between">
        <div className="text-xs text-slate-400 font-mono">
          Available: <span className="font-bold text-emerald-400 text-sm">{available}</span>
          <span className="text-slate-500"> / {capacity}</span>
        </div>
        <button
          id={`btn-view-details-${event.id}`}
          onClick={() => onSelect(event.id)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800/90 hover:bg-emerald-600 hover:text-white text-slate-200 transition-all group-hover:bg-emerald-600 group-hover:text-white"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
};
