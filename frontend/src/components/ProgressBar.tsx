import React from 'react';

interface ProgressBarProps {
  progress: number; // 0.0 to 1.0
  stage?: string;
  processedCount?: number;
  totalCount?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  stage,
  processedCount,
  totalCount,
}) => {
  const pct = Math.min(100, Math.max(0, Math.round(progress * 100)));

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-700">{stage || 'Processing'}</span>
        <span className="font-mono text-slate-500">
          {totalCount && totalCount > 0
            ? `${processedCount?.toLocaleString()} / ${totalCount?.toLocaleString()} (${pct}%)`
            : `${processedCount?.toLocaleString() || 0} records processed`}
        </span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-teal-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
