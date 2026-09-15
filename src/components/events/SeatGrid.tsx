import React, { useState } from 'react';
import { Armchair, Users, Plus, Minus, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { updateEventCapacity } from '../../lib/eventsStore';

interface SeatGridProps {
  eventId: string;
  capacity: number;
  activeCount: number;
  userSeatNumber?: number | null;
  isAdmin?: boolean;
  onCapacityChange?: (newCap: number) => void;
}

export const SeatGrid: React.FC<SeatGridProps> = ({
  eventId,
  capacity,
  activeCount,
  userSeatNumber,
  isAdmin = false,
  onCapacityChange,
}) => {
  const { success, error: toastError } = useToast();
  const [customInput, setCustomInput] = useState<string>(String(capacity));
  const [isUpdating, setIsUpdating] = useState(false);

  // Common seat number presets (requested 10 to 15 range)
  const presets = [10, 12, 14, 15];

  const handleApplyCapacity = async (newCap: number) => {
    if (newCap < activeCount) {
      toastError(`Cannot reduce seats to ${newCap}. There are already ${activeCount} registered attendees.`);
      return;
    }
    if (newCap <= 0) {
      toastError('Seat number must be at least 1.');
      return;
    }

    try {
      setIsUpdating(true);
      const res = await updateEventCapacity(eventId, newCap);
      if (res.success) {
        success(`Event seats updated to ${newCap}!`);
        setCustomInput(String(newCap));
        if (onCapacityChange) onCapacityChange(newCap);
      } else {
        toastError(res.message);
      }
    } catch {
      toastError('Failed to update seat number.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Generate seats array 1..capacity
  const totalSeats = Math.max(1, capacity);
  const seats = Array.from({ length: totalSeats }, (_, i) => i + 1);

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Armchair className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Event Seat Allocation</span>
              <span className="text-xs font-mono font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {totalSeats} Total Seats
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Reserved: <strong className="text-slate-200">{activeCount}</strong> · Available:{' '}
              <strong className="text-emerald-400 font-bold">{Math.max(0, totalSeats - activeCount)}</strong>
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
            <span className="text-slate-400">Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-slate-800 border border-slate-700" />
            <span className="text-slate-400">Reserved</span>
          </div>
          {userSeatNumber && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-cyan-500 border border-cyan-400 animate-pulse" />
              <span className="text-cyan-300 font-semibold">Your Seat</span>
            </div>
          )}
        </div>
      </div>

      {/* Admin Capacity Manager Toolbar */}
      {isAdmin && (
        <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-800/60 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs font-mono uppercase tracking-wider text-indigo-300 font-bold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Admin: Manage Total Seat Numbers (Capacity)</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Minimum capacity allowed: <strong className="text-emerald-400">{activeCount}</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">Quick Set:</span>
            {presets.map((preset) => {
              const isDisabled = preset < activeCount || isUpdating;
              const isCurrent = preset === capacity;
              return (
                <button
                  key={preset}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleApplyCapacity(preset)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    isCurrent
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                      : 'bg-slate-900 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/30 disabled:opacity-40 disabled:hover:bg-slate-900'
                  }`}
                >
                  {preset} Seats
                </button>
              );
            })}

            {/* Increment / Decrement & Custom Input */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                type="button"
                disabled={isUpdating || capacity <= Math.max(1, activeCount)}
                onClick={() => handleApplyCapacity(capacity - 1)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 flex items-center justify-center text-xs disabled:opacity-40"
                title="Decrease 1 seat"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>

              <input
                type="number"
                min={activeCount}
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyCapacity(Number(customInput));
                  }
                }}
                className="w-16 px-2 py-1.5 rounded-lg bg-slate-950 border border-indigo-500/50 text-xs font-mono text-center text-white focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />

              <button
                type="button"
                disabled={isUpdating}
                onClick={() => handleApplyCapacity(capacity + 1)}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 flex items-center justify-center text-xs disabled:opacity-40"
                title="Increase 1 seat"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                disabled={isUpdating || Number(customInput) === capacity}
                onClick={() => handleApplyCapacity(Number(customInput))}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 flex items-center gap-1 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Seat Map (Seats 01 through Total Capacity) */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
          {seats.map((seatNum) => {
            const isUserSeat = userSeatNumber === seatNum;
            const isReserved = seatNum <= activeCount;
            const isAvailable = !isReserved;

            let badgeStyle = 'bg-slate-950/60 border-slate-800 text-slate-500';
            if (isUserSeat) {
              badgeStyle =
                'bg-gradient-to-br from-cyan-500 to-teal-600 border-cyan-300 text-white font-bold shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/50 scale-[1.03]';
            } else if (isReserved) {
              badgeStyle = 'bg-slate-900/90 border-slate-700/80 text-slate-400';
            } else {
              badgeStyle =
                'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-400';
            }

            return (
              <div
                key={seatNum}
                id={`seat-badge-${seatNum}`}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 relative ${badgeStyle}`}
              >
                <Armchair className={`w-4 h-4 ${isUserSeat ? 'text-white' : isAvailable ? 'text-emerald-400' : 'text-slate-600'}`} />
                <span className="font-mono text-xs font-bold tracking-tight">
                  Seat #{seatNum < 10 ? `0${seatNum}` : seatNum}
                </span>
                <span className="text-[10px] font-mono tracking-wider uppercase opacity-80">
                  {isUserSeat ? 'Your Seat' : isReserved ? 'Reserved' : 'Available'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
