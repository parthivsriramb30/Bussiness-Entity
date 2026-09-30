import React, { useState, useEffect } from 'react';
import {
  Download,
  FileCheck,
  Package,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ExternalLink,
  ShieldAlert,
  Play
} from 'lucide-react';
import { api } from '../api/client';
import { JobStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface ExportsProps {
  initialRunId?: string | null;
}

export const Exports: React.FC<ExportsProps> = ({ initialRunId }) => {
  const [runs, setRuns] = useState<JobStatus[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(initialRunId || '');
  const [teamName, setTeamName] = useState<string>('EntityMatchTeam');
  const [validationReport, setValidationReport] = useState<any | null>(null);
  const [validating, setValidating] = useState<boolean>(false);
  const [checkIds, setCheckIds] = useState<boolean>(false);

  useEffect(() => {
    const loadRuns = async () => {
      try {
        const jRes = await api.getJobs();
        const completed = jRes.jobs.filter((j) => j.status === 'completed');
        setRuns(completed);

        if (!selectedRunId && completed.length > 0) {
          setSelectedRunId(completed[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadRuns();
  }, []);

  const handleRunValidator = async () => {
    if (!selectedRunId) return;
    setValidating(true);
    try {
      const res = await api.validateRun(selectedRunId, checkIds);
      setValidationReport(res);
    } catch (err: any) {
      alert(`Validator execution failed: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const isSample = selectedRun?.mode === 'sample';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">Challenge Submission & Exports</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Download the two required competition TSVs, execute the official validator script, and build the submission ZIP.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={selectedRunId}
            onChange={(e) => {
              setSelectedRunId(e.target.value);
              setValidationReport(null);
            }}
            className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-800"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                Run {r.id} ({r.mode}, {r.processed_count.toLocaleString()} entities)
              </option>
            ))}
            {runs.length === 0 && <option value="">No completed runs available</option>}
          </select>
        </div>
      </div>

      {/* Sample Run Notice if applicable */}
      {isSample && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900 text-xs shadow-2xs space-y-1">
          <div className="font-semibold flex items-center space-x-1.5">
            <AlertTriangle size={15} className="text-amber-700 shrink-0" />
            <span>Sample Benchmark Run Selected</span>
          </div>
          <p>
            This run processed a sample subset ({selectedRun?.sample_size?.toLocaleString()} records) for validation. The challenge leaderboard scorer requires predictions for 100% of test entities (~1.73M records). Use this run to inspect outputs and test format compliance, then launch a full test set run for final submission.
          </p>
        </div>
      )}

      {/* The Two Official Deliverables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* matching_results.tsv */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-sm font-bold text-slate-900">output/matching_results.tsv</div>
              <div className="text-xs text-slate-500 mt-0.5">Only file scored on the leaderboard</div>
            </div>
            <StatusBadge status="LEADERBOARD" size="sm" />
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Columns:</span>
              <span className="font-mono text-slate-800">source1_entity_id &lt;TAB&gt; matched_entity_ids</span>
            </div>
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="text-slate-800">Tab-separated (.tsv), comma-separated IDs</span>
            </div>
            <div className="flex justify-between">
              <span>Rules:</span>
              <span className="text-slate-800">1 row per S1 entity, no duplicates, S2-/S3- only</span>
            </div>
          </div>
          <a
            href={selectedRunId ? api.getMatchingDownloadUrl(selectedRunId) : '#'}
            download="matching_results.tsv"
            className={`w-full inline-flex items-center justify-center space-x-2 py-2 rounded text-xs font-semibold transition-colors ${
              selectedRunId
                ? 'bg-teal-600 hover:bg-teal-700 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download size={14} />
            <span>Download matching_results.tsv</span>
          </a>
        </div>

        {/* candidate_pairs.tsv */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-mono text-sm font-bold text-slate-900">output/candidate_pairs.tsv</div>
              <div className="text-xs text-slate-500 mt-0.5">Exact candidate set scored by the ML model</div>
            </div>
            <StatusBadge status="AUDIT" size="sm" />
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Columns:</span>
              <span className="font-mono text-slate-800">source1_entity_id &lt;TAB&gt; candidate_entity_ids</span>
            </div>
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="text-slate-800">Tab-separated (.tsv), comma-separated IDs</span>
            </div>
            <div className="flex justify-between">
              <span>Rules:</span>
              <span className="text-slate-800">All matches must appear in candidates</span>
            </div>
          </div>
          <a
            href={selectedRunId ? api.getCandidateDownloadUrl(selectedRunId) : '#'}
            download="candidate_pairs.tsv"
            className={`w-full inline-flex items-center justify-center space-x-2 py-2 rounded text-xs font-semibold transition-colors ${
              selectedRunId
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Download size={14} />
            <span>Download candidate_pairs.tsv</span>
          </a>
        </div>
      </div>

      {/* Official Submission Package Builder */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Package size={16} className="text-teal-600" />
              <span>Final Submission Archive Builder</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Packages code, outputs, pinned requirements, saved checkpoint, and methodology into the exact competition structure.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Team Name Prefix</label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="e.g. EntityMatchTeam"
              className="w-full bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900 font-medium"
            />
          </div>
          <div>
            <a
              href={selectedRunId ? api.getPackageDownloadUrl(selectedRunId, teamName) : '#'}
              className={`w-full inline-flex items-center justify-center space-x-2 py-2 rounded text-xs font-semibold transition-colors ${
                selectedRunId
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Package size={14} />
              <span>Download {teamName}_submission.zip</span>
            </a>
          </div>
        </div>

        {/* Structure Preview */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-700 leading-relaxed">
          <div>&lt;{teamName}&gt;_submission.zip</div>
          <div className="pl-4">├── output/matching_results.tsv</div>
          <div className="pl-4">├── output/candidate_pairs.tsv</div>
          <div className="pl-4">├── code/business_entity_resolution/src/</div>
          <div className="pl-4">├── code/business_entity_resolution/README.md</div>
          <div className="pl-4">├── code/business_entity_resolution/requirements.txt</div>
          <div className="pl-4">├── code/business_entity_resolution/matcher_model.pkl</div>
          <div className="pl-4">└── Documentation_template.md</div>
        </div>
      </div>

      {/* Official CLI Validator Integration */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileCheck size={16} className="text-teal-600" />
              <span>Official Challenge Submission Validator</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Runs <span className="font-mono">utils/validate_submission.py</span> directly against output files.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={checkIds}
                onChange={(e) => setCheckIds(e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Enable ID-existence check (--check-ids)</span>
            </label>
            <button
              onClick={handleRunValidator}
              disabled={validating || !selectedRunId}
              className="inline-flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-semibold transition-colors"
            >
              <Play size={13} />
              <span>{validating ? 'Running Validator...' : 'Run Validator'}</span>
            </button>
          </div>
        </div>

        {/* Validation Output Display */}
        {validationReport && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center space-x-2">
              {validationReport.passed ? (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs">
                  <CheckCircle2 size={13} />
                  <span>VALIDATION PASSED (Exit Code 0)</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-100 text-rose-900 border border-rose-300 font-bold text-xs">
                  <AlertTriangle size={13} />
                  <span>VALIDATION FAILED (Exit Code {validationReport.exit_code})</span>
                </span>
              )}
            </div>

            <pre className="bg-slate-950 text-slate-200 font-mono text-xs p-4 rounded-lg overflow-x-auto border border-slate-800 leading-relaxed">
              {validationReport.stdout || validationReport.stderr || 'No output recorded.'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
