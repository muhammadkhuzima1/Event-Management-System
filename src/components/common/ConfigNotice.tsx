import React from 'react';
import { AlertTriangle, KeyRound, ExternalLink } from 'lucide-react';
import { missingConfigDetails } from '../../lib/supabase';

export const ConfigNotice: React.FC = () => {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 text-amber-200 backdrop-blur-md max-w-3xl mx-auto my-8 shadow-xl">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-amber-100 flex items-center gap-2">
            <span>Supabase Connection Required</span>
            <span className="text-xs uppercase tracking-wider bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded">
              Action Needed
            </span>
          </h3>
          <p className="mt-2 text-sm text-amber-200/90 leading-relaxed">
            <strong>Nowshera Events Co.</strong> is connected to a production PostgreSQL database via Supabase.
            To authenticate attendees, fetch events, and handle secure RPC registrations, configure the following
            environment variables in your project settings or <code className="bg-amber-950/60 px-1.5 py-0.5 rounded text-amber-300">.env</code>:
          </p>

          <div className="mt-4 grid sm:grid-cols-2 gap-3 text-xs font-mono">
            <div
              className={`p-3 rounded-lg border ${
                missingConfigDetails.missingUrl
                  ? 'bg-rose-950/40 border-rose-600/40 text-rose-200'
                  : 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <KeyRound className="w-3.5 h-3.5" />
                <span>VITE_SUPABASE_URL</span>
              </div>
              <p className="text-[11px] opacity-80">
                {missingConfigDetails.missingUrl ? 'Missing or placeholder value' : 'Configured'}
              </p>
            </div>

            <div
              className={`p-3 rounded-lg border ${
                missingConfigDetails.missingKey
                  ? 'bg-rose-950/40 border-rose-600/40 text-rose-200'
                  : 'bg-emerald-950/40 border-emerald-600/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                <KeyRound className="w-3.5 h-3.5" />
                <span>VITE_SUPABASE_ANON_KEY</span>
              </div>
              <p className="text-[11px] opacity-80">
                {missingConfigDetails.missingKey ? 'Missing or placeholder value' : 'Configured'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-amber-300/80">
            <span>Only client-safe publishable/anon keys are used. No Service Role keys are exposed.</span>
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-amber-300 hover:text-white underline underline-offset-2"
            >
              <span>Supabase Dashboard</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
