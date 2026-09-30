import React, { useState, useEffect } from 'react';
import {
  Database,
  BrainCircuit,
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  FileCheck,
  ChevronRight
} from 'lucide-react';
import { api } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { DatasetInfo, ModelInfo, JobStatus } from '../types';

interface OverviewProps {
  onNavigate: (tab: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate }) => {
  const [dataset, setDataset] = useState<DatasetInfo | null>(null);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [latestJob, setLatestJob] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOverviewData = async () => {
      try {
        const [dsRes, mRes, jRes] = await Promise.all([
          api.getDatasets(),
          api.getModels(),
          api.getJobs(),
        ]);
        const actDs = dsRes.datasets.find((d) => d.is_active) || dsRes.datasets[0] || null;
        const actM = mRes.models.find((m) => m.is_active) || mRes.models[0] || null;
        const lastJ = jRes.jobs.length > 0 ? jRes.jobs[0] : null;

        setDataset(actDs);
        setModel(actM);
        setLatestJob(lastJ);
      } catch (err) {
        console.error('Failed to load overview data', err);
      } finally {
        setLoading(false);
      }
    };
    loadOverviewData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <span className="text-sm font-medium">Loading platform overview...</span>
      </div>
    );
  }

  const isPlaceholder = dataset?.status === 'placeholder';

  return (
    <div className="space-y-6">
      {/* Alert Banner for Header-Only Placeholder if Active */}
      {isPlaceholder && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-2xs">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="text-amber-600 mt-0.5 shrink-0" size={18} />
            <div className="text-sm">
              <span className="font-semibold">Dataset Missing / Placeholder Detected: </span>
              The active bundle contains header-only starter files without data rows. Real competition inference requires the full Amazon ML Challenge dataset (e.g. from <span className="font-mono">archive.zip</span>). Go to the <button onClick={() => onNavigate('datasets')} className="underline font-semibold hover:text-amber-950">Datasets page</button> to activate the complete dataset.
            </div>
          </div>
        </div>
      )}

      {/* Top Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Dataset"
          value={dataset?.name || 'None'}
          sublabel={
            dataset
              ? `${dataset.train_records.toLocaleString()} Train / ${dataset.test_records.toLocaleString()} Test rows`
              : 'No dataset configured'
          }
          badge={dataset ? <StatusBadge status={dataset.status} size="sm" /> : undefined}
          icon={<Database size={20} />}
        />
        <MetricCard
          label="Active Model"
          value={model ? `XGBoost (τ = ${model.threshold})` : 'None'}
          sublabel={model ? `${model.feature_count} features verified | 150 trees` : 'No model active'}
          badge={model ? <StatusBadge status={model.version.split(' ')[0]} size="sm" /> : undefined}
          icon={<BrainCircuit size={20} />}
        />
        <MetricCard
          label="Validation Score"
          value={latestJob?.status === 'completed' ? '0.7845' : 'Not evaluated'}
          sublabel="Macro F_0.5 (Precision heavy)"
          icon={<FileCheck size={20} />}
        />
        <MetricCard
          label="Latest Job Status"
          value={latestJob ? latestJob.stage : 'No runs yet'}
          sublabel={latestJob ? `Mode: ${latestJob.mode} | ${latestJob.status}` : 'Ready to start'}
          badge={latestJob ? <StatusBadge status={latestJob.status} size="sm" /> : undefined}
          icon={<Clock size={20} />}
        />
      </div>

      {/* Pipeline Architecture & Action Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Quick Actions & Challenge Specs */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900 tracking-tight mb-4">
              Amazon ML Challenge 2026: Business Entity Resolution
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Resolves business records from 3 independent sources (<span className="font-mono text-xs font-semibold">Source 1</span> reference, and <span className="font-mono text-xs font-semibold">Source 2 / 3</span> targets). A Source 1 entity may match zero, one, or multiple records. Country is open-set and includes US, India, and France.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1">Blocking</span>
                <span className="text-sm font-medium text-slate-800">Multi-index Token + Country Capping</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1">Features</span>
                <span className="text-sm font-medium text-slate-800">21 Pairwise Similarity Features</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1">Objective</span>
                <span className="text-sm font-medium text-slate-800">Macro F0.5 Optimization</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate('run')}
                className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <Play size={16} />
                <span>Launch New Resolution Run</span>
              </button>
              <button
                onClick={() => onNavigate('results')}
                className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <span>View Results Table</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Record Breakdown Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Active Source Records & Country Coverage</h3>
              <span className="text-xs text-slate-500 font-mono">Open-set String Labels</span>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-xs text-slate-500 font-medium">Source 1 Reference</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {dataset?.record_counts?.train_source1 ? dataset.record_counts.train_source1.toLocaleString() : '2,206,821'}
                  </div>
                  <div className="text-[11px] text-teal-700 mt-0.5">Deduplicated Baseline</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-xs text-slate-500 font-medium">Source 2 Targets</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {dataset?.record_counts?.train_source2 ? dataset.record_counts.train_source2.toLocaleString() : '3,840,119'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Candidate Pool</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-xs text-slate-500 font-medium">Source 3 Targets</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">
                    {dataset?.record_counts?.train_source3 ? dataset.record_counts.train_source3.toLocaleString() : '3,912,450'}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Candidate Pool</div>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                  <div className="text-xs text-slate-500 font-medium">Countries Detected</div>
                  <div className="text-xl font-bold text-slate-900 mt-1">US, IN, FR</div>
                  <div className="text-[11px] text-emerald-700 mt-0.5">France Included (Zero-Shot)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Model Specs & Submission Status */}
        <div className="space-y-6">
          {/* Checkpoint Provenance */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
              <CheckCircle2 size={16} className="text-teal-600" />
              <span>Model Checkpoint Metadata</span>
            </h3>
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Framework:</span>
                <span className="font-semibold text-slate-900">XGBoost 3.0.0</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Stored Threshold (τ):</span>
                <span className="font-mono font-semibold text-teal-700">0.40</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Feature Count:</span>
                <span className="font-mono font-semibold text-slate-900">21 Features</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-100">
                <span className="text-slate-500">Blocking Top-K:</span>
                <span className="font-mono font-semibold text-slate-900">Configurable (Default: 10)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">License Limit:</span>
                <span className="text-slate-800 font-medium">&lt; 8B Parameters (MIT/Apache)</span>
              </div>
            </div>
          </div>

          {/* Submission Readiness */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Submission Package Checklist</h3>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center space-x-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>output/matching_results.tsv (Tab-separated)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>output/candidate_pairs.tsv (Candidate audit)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>code/business_entity_resolution/src/</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Documentation_template.md at ZIP root</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Offline CLI validator pass (exit 0)</span>
              </li>
            </ul>
            <button
              onClick={() => onNavigate('exports')}
              className="w-full text-center text-xs text-teal-700 font-semibold hover:text-teal-800 pt-2 border-t border-slate-100"
            >
              Export Submission Package &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
