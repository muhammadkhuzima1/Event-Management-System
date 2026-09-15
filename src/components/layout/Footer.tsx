import React from 'react';
import { Calendar, MapPin, Mail, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="md:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-white font-bold text-lg">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm">
              N
            </div>
            <span>Nowshera Events Co.</span>
          </div>
          <p className="text-sm text-slate-400 max-w-md leading-relaxed">
            The dedicated event management platform for workshops, technical seminars, and community gatherings in Nowshera.
            Replacing chaotic manual messaging with real-time registrations and capacity tracking.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <h4 className="text-white font-semibold tracking-wider text-xs uppercase font-mono">Platform</h4>
          <ul className="space-y-1.5 text-slate-400">
            <li>Community Workshops</li>
            <li>Technical Seminars</li>
            <li>Educational Series</li>
            <li>Capacity Management</li>
          </ul>
        </div>

        <div className="space-y-2 text-sm">
          <h4 className="text-white font-semibold tracking-wider text-xs uppercase font-mono">Location & Trust</h4>
          <p className="flex items-center gap-2 text-slate-400">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Nowshera, Khyber Pakhtunkhwa</span>
          </p>
          <p className="flex items-center gap-2 text-slate-400">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Secured with PostgreSQL RLS</span>
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>&copy; {new Date().getFullYear()} Nowshera Events Co. All rights reserved.</p>
        <p className="font-mono">Production Database Active • Client-Safe Publishable Key</p>
      </div>
    </footer>
  );
};
