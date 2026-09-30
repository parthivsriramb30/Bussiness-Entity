import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  HardDrive,
  Folder,
  Terminal,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import { HardwareMetrics } from '../types';

export const Settings: React.FC = () => {
  const [settingsData, setSettingsData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await api.getSettings();
        setSettingsData(res);
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading settings and diagnostics...</div>;
  }

  const hw: HardwareMetrics | undefined = settingsData?.hardware;

  return (
    <div className="space-y-6">
      {/* System Information Header */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">System Configuration & Paths</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          All relative paths are anchored consistently to the project root (<span className="font-mono">student_resource</span>).
        </p>

        <div className="mt-4 space-y-2 text-xs font-mono">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between">
            <span className="text-slate-500">Repository Root:</span>
            <span className="text-slate-900 font-semibold">{settingsData?.base_dir}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between">
            <span className="text-slate-500">Dataset Directory:</span>
            <span className="text-slate-900 font-semibold">{settingsData?.dataset_dir}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between">
            <span className="text-slate-500">Storage Runs Directory:</span>
            <span className="text-slate-900 font-semibold">{settingsData?.runs_dir}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded flex justify-between">
            <span className="text-slate-500">Model Checkpoint:</span>
            <span className="text-slate-900 font-semibold">{settingsData?.default_model_path}</span>
          </div>
        </div>
      </div>

      {/* Hardware Diagnostics */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Cpu size={16} className="text-teal-600" />
          <span>Hardware & Resource Measurements (Honest Reporting)</span>
        </h3>
        <p className="text-xs text-slate-600">
          Target hardware: Ryzen 5 HS, 16 GB system RAM, RTX 3050 6GB. CPU execution is fully validated and benchmarked without artificial GPU dependencies.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold uppercase text-slate-500">CPU Cores & Load</span>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {hw?.cpu_cores} Logical Cores ({hw?.cpu_percent}%)
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">XGBoost n_jobs=-1 multi-threading</div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold uppercase text-slate-500">System RAM Allocation</span>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {hw?.used_ram_gb} GB / {hw?.total_ram_gb} GB ({hw?.ram_percent}%)
            </div>
            <div className="text-[11px] text-teal-700 mt-0.5">{hw?.available_ram_gb} GB free memory</div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Local Disk Storage</span>
            <div className="text-lg font-bold text-slate-900 mt-1">
              {hw?.disk_free_gb} GB Free
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Total capacity: {hw?.disk_total_gb} GB</div>
          </div>
        </div>
      </div>

      {/* Standalone CLI Instructions */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Terminal size={16} className="text-teal-600" />
          <span>Standalone ML CLI Reproduction (Headless)</span>
        </h3>
        <p className="text-xs text-slate-600">
          The ML pipeline can be reproduced entirely from the command line without the web dashboard:
        </p>

        <div className="space-y-2 text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-lg border border-slate-800 overflow-x-auto leading-relaxed">
          <div className="text-slate-400"># 1. Saved model inference (sample mode):</div>
          <div className="text-teal-300">python code/business_entity_resolution/run_saved_model.py --model code/business_entity_resolution/matcher_model.pkl --limit 2000</div>
          
          <div className="text-slate-400 pt-2"># 2. Saved model inference (full test set):</div>
          <div className="text-teal-300">python code/business_entity_resolution/run_saved_model.py --model code/business_entity_resolution/matcher_model.pkl --limit 0</div>

          <div className="text-slate-400 pt-2"># 3. Format & ID validation:</div>
          <div className="text-teal-300">python utils/validate_submission.py --matching output/matching_results.tsv --candidate output/candidate_pairs.tsv --test-dir dataset/test --check-ids</div>
        </div>
      </div>
    </div>
  );
};
