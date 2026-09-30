import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toLowerCase();
  
  let styles = 'bg-slate-100 text-slate-700 border-slate-300';

  if (s === 'ready' || s === 'completed' || s === 'passed' || s === 'agreed') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  } else if (s === 'running') {
    styles = 'bg-teal-50 text-teal-800 border-teal-300 animate-pulse';
  } else if (s === 'queued') {
    styles = 'bg-amber-50 text-amber-800 border-amber-300';
  } else if (s === 'failed' || s === 'error') {
    styles = 'bg-rose-50 text-rose-800 border-rose-300';
  } else if (s === 'placeholder') {
    styles = 'bg-amber-100 text-amber-900 border-amber-400 font-semibold';
  } else if (s === 'incomplete') {
    styles = 'bg-orange-50 text-orange-800 border-orange-300';
  } else if (s === 'cancelled' || s === 'interrupted') {
    styles = 'bg-slate-200 text-slate-700 border-slate-400';
  }

  const px = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center rounded-full border font-medium uppercase tracking-wider ${px} ${styles}`}>
      {status}
    </span>
  );
};
