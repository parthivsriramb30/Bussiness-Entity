import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  StopCircle,
  RefreshCw,
  Terminal,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Layers,
  Clock
} from 'lucide-react';
import { api } from '../api/client';
import { JobStatus, DatasetInfo, ModelInfo } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';

interface RunResolutionProps {
  onNavigateToResults: (runId: string) => void;
}

export const RunResolution: React.FC<RunResolutionProps> = ({ onNavigateToResults }) => {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  // Configuration state
  const [mode, setMode] = useState<'sample' | 'full'>('sample');
  const [sampleSize, setSampleSize] = useState<number>(2000);
  const [topK, setTopK] = useState<number>(10);
  const [threshold, setThreshold] = useState<number>(0.40);
  const [batchSize, setBatchSize] = useState<number>(5000);
  const [maxMatches, setMaxMatches] = useState<string>(''); // empty means unlimited

  // Active / Recent Jobs
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [activeJob, setActiveJob] = useState<JobStatus | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [launching, setLaunching] = useState<boolean>(false);
  const logContainerRef = useRef<HTMLPreElement | null>(null);

  // Load datasets, models, and jobs
  const refreshAll = async () => {
    try {
      const [dsRes, mRes, jRes] = await Promise.all([
        api.getDatasets(),
        api.getModels(),
        api.getJobs(),
      ]);
      setDatasets(dsRes.datasets);
      setModels(mRes.models);
      setJobs(jRes.jobs);

      const actDs = dsRes.datasets.find((d) => d.is_active) || dsRes.datasets[0];
      if (actDs && !selectedDatasetId) setSelectedDatasetId(actDs.id);

      const actM = mRes.models.find((m) => m.is_active) || mRes.models[0];
      if (actM && !selectedModelId) setSelectedModelId(actM.id);

      // Check if there is a running/queued job
      const running = jRes.jobs.find((j) => j.status === 'running' || j.status === 'queued');
      if (running) {
        setActiveJob(running);
      } else if (!activeJob && jRes.jobs.length > 0) {
        setActiveJob(jRes.jobs[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Poll active job status & logs if running
  useEffect(() => {
    if (!activeJob) return;

    const poll = async () => {
      try {
        const [statusRes, logRes] = await Promise.all([
          api.getJobStatus(activeJob.id),
          api.getJobLogs(activeJob.id),
        ]);
        setActiveJob(statusRes);
        setLogs(logRes.logs);

        // Auto-scroll logs
        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }

        // Refresh list if status changed to completed/failed
        if (statusRes.status !== 'running' && statusRes.status !== 'queued') {
          api.getJobs().then((r) => setJobs(r.jobs));
        }
      } catch (err) {
        console.error('Job polling error', err);
      }
    };

    poll();
    if (activeJob.status === 'running' || activeJob.status === 'queued') {
      const interval = setInterval(poll, 1500);
      return () => clearInterval(interval);
    }
  }, [activeJob?.id, activeJob?.status]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaunching(true);

    try {
      const launched = await api.launchJob({
        job_type: 'inference',
        mode,
        sample_size: mode === 'sample' ? sampleSize : 0,
        top_k: topK,
        threshold,
        max_matches: maxMatches ? parseInt(maxMatches, 10) : undefined,
        dataset_id: selectedDatasetId || undefined,
        model_id: selectedModelId || undefined,
      });

      setActiveJob(launched);
      setLogs('Job dispatched to background worker process...\n');
      await refreshAll();
    } catch (err: any) {
      alert(`Launch error: ${err.message}`);
    } finally {
      setLaunching(false);
    }
  };

  const handleCancel = async () => {
    if (!activeJob) return;
    try {
      await api.cancelJob(activeJob.id);
      setActiveJob({ ...activeJob, status: 'cancelled', stage: 'Cancelled by user' });
      await refreshAll();
    } catch (err: any) {
      alert(`Cancel error: ${err.message}`);
    }
  };

  const currentDataset = datasets.find((d) => d.id === selectedDatasetId);
  const isDatasetPlaceholder = currentDataset?.status === 'placeholder';

  return (
    <div className="space-y-6">
      {/* Configuration & Launch Panel */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Run Business Entity Resolution</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Launches an asynchronous job worker to execute blocking, feature extraction, and XGBoost scoring.
            </p>
          </div>
          {isDatasetPlaceholder && (
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded text-amber-900 text-xs">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <span>Selected dataset is header-only placeholder!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleLaunch} className="space-y-6">
          {/* Row 1: Mode & Scope */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-slate-50/50 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">Execution Mode</label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="sample"
                    checked={mode === 'sample'}
                    onChange={() => setMode('sample')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>Sample Benchmark Mode</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-medium text-slate-800 cursor-pointer">
                  <input
                    type="radio"
                    name="mode"
                    value="full"
                    checked={mode === 'full'}
                    onChange={() => setMode('full')}
                    className="text-teal-600 focus:ring-teal-500"
                  />
                  <span>Full Test Set Execution</span>
                </label>
              </div>
              <p className="text-[11px] text-slate-500">
                {mode === 'sample'
                  ? 'Processes a bounded subset of Source 1 records for fast turnaround and verification.'
                  : 'Scores all 1.7M+ test entities for official competition submission.'}
              </p>
            </div>

            {mode === 'sample' && (
              <div className="p-4 border rounded-lg bg-slate-50/50 space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                  Sample Record Limit (Source 1)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100000"
                  step="100"
                  value={sampleSize}
                  onChange={(e) => setSampleSize(parseInt(e.target.value, 10) || 1000)}
                  className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono text-slate-900"
                />
                <div className="flex space-x-2 text-[11px]">
                  {[500, 2000, 10000, 25000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSampleSize(val)}
                      className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                    >
                      {val.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Row 2: Model & Threshold Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Blocking Top-K</label>
              <input
                type="number"
                min="3"
                max="50"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value, 10) || 10)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900"
              />
              <span className="text-[11px] text-slate-500">Candidates per S1 entity</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Decision Threshold (τ)</label>
              <input
                type="number"
                min="0.10"
                max="0.99"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value) || 0.40)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900"
              />
              <span className="text-[11px] text-slate-500">Model default is 0.40</span>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Match Cap (Optional)</label>
              <input
                type="number"
                min="1"
                max="20"
                placeholder="Unlimited (default)"
                value={maxMatches}
                onChange={(e) => setMaxMatches(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono text-slate-900"
              />
              <span className="text-[11px] text-slate-500">Leave blank for all matches above τ</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-slate-500">
              Target execution: <span className="font-mono text-slate-700">Ryzen 5 HS / 16GB System RAM (CPU Safe)</span>
            </div>
            <button
              type="submit"
              disabled={launching || activeJob?.status === 'running' || isDatasetPlaceholder}
              className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-md text-sm font-semibold transition-colors shadow-xs"
            >
              <Play size={16} />
              <span>{launching ? 'Launching Process...' : 'Execute Resolution Pipeline'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Job Tracker & Progress */}
      {activeJob && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Job:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{activeJob.id}</span>
                <StatusBadge status={activeJob.status} size="sm" />
              </div>
              <div className="text-xs text-slate-500 mt-1 flex items-center space-x-3">
                <span>Mode: <strong className="text-slate-700">{activeJob.mode}</strong></span>
                <span>•</span>
                <span>Stage: <strong className="text-teal-700">{activeJob.stage}</strong></span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {activeJob.status === 'running' && (
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 text-xs font-medium transition-colors"
                >
                  <StopCircle size={14} />
                  <span>Cancel Job</span>
                </button>
              )}
              {activeJob.status === 'completed' && (
                <button
                  onClick={() => onNavigateToResults(activeJob.id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 text-xs font-medium transition-colors"
                >
                  <span>Explore Results &rarr;</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <ProgressBar
            progress={activeJob.progress}
            stage={activeJob.stage}
            processedCount={activeJob.processed_count}
            totalCount={activeJob.total_count}
          />

          {/* Real-time Streaming Logs Terminal */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold uppercase tracking-wider flex items-center space-x-1">
                <Terminal size={14} className="text-teal-600" />
                <span>Worker Execution Logs</span>
              </span>
              <span className="font-mono text-[11px]">storage/runs/{activeJob.id}/run.log</span>
            </div>
            <pre
              ref={logContainerRef}
              className="bg-slate-950 text-slate-200 font-mono text-xs p-4 rounded-lg h-64 overflow-y-auto leading-relaxed border border-slate-800"
            >
              {logs || 'Awaiting log stream from worker process...'}
            </pre>
          </div>
        </div>
      )}

      {/* Historical Jobs List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Recent Resolution Jobs</h3>
          <span className="text-xs text-slate-500">{jobs.length} recorded</span>
        </div>
        <div className="divide-y divide-slate-100">
          {jobs.map((j) => (
            <div
              key={j.id}
              onClick={() => setActiveJob(j)}
              className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors ${
                activeJob?.id === j.id ? 'bg-slate-50 font-medium' : ''
              }`}
            >
              <div className="flex items-center space-x-4">
                <StatusBadge status={j.status} size="sm" />
                <div>
                  <div className="font-mono text-xs font-semibold text-slate-900">{j.id}</div>
                  <div className="text-[11px] text-slate-500">
                    Mode: {j.mode} • Processed: {j.processed_count.toLocaleString()} • {j.stage}
                  </div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500">
                <div>{j.started_at ? new Date(j.started_at).toLocaleTimeString() : '-'}</div>
                {j.status === 'completed' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigateToResults(j.id);
                    }}
                    className="text-teal-700 hover:text-teal-800 font-semibold"
                  >
                    View &rarr;
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
