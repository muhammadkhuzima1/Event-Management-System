import React, { ReactNode } from 'react';
import { CalendarX, Inbox, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon = CalendarX,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-900/40 border border-slate-800/80 rounded-2xl max-w-lg mx-auto my-8">
      <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center text-slate-400 mb-4 border border-slate-700/50">
        <Icon className="w-8 h-8 stroke-[1.5]" />
      </div>
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-slate-400 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};
