import React from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ label, value, sublabel, badge, icon }) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {badge ? badge : icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      {sublabel && <div className="mt-1 text-xs text-slate-500">{sublabel}</div>}
    </div>
  );
};
