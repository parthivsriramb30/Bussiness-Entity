import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import { ResultRow, ResultsResponse, JobStatus } from '../types';
import { StatusBadge } from '../components/StatusBadge';

interface ResultsProps {
  activeRunId: string | null;
  onSelectEntityForComparison: (runId: string, s1Id: string) => void;
  onNavigateToExports: (runId: string) => void;
}

export const Results: React.FC<ResultsProps> = ({
  activeRunId,
  onSelectEntityForComparison,
  onNavigateToExports,
}) => {
  const [runs, setRuns] = useState<JobStatus[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(activeRunId || '');
  const [resultsData, setResultsData] = useState<ResultsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Filter & Pagination state
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [search, setSearch] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all'); // all, matched, singletons

  // Load available completed runs
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

  // Fetch results when run, page, search, or filter changes
  useEffect(() => {
    if (!selectedRunId) return;

    const fetchResults = async () => {
      setLoading(true);
      try {
        const data = await api.getResults(selectedRunId, page, pageSize, search || undefined, filterType);
        setResultsData(data);
      } catch (err) {
        console.error('Failed to load run results', err);
        setResultsData(null);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchResults, 250);
    return () => clearTimeout(timer);
  }, [selectedRunId, page, pageSize, search, filterType]);

  return (
    <div className="space-y-6">
      {/* Run Selector & Top Summary */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Entity Resolution Predictions</h2>
            {selectedRunId && <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-semibold">{selectedRunId}</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Deduplicated Source 1 queries with mapped Source 2 and Source 3 matching clusters.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold uppercase text-slate-500 block">Select Run:</label>
            <select
              value={selectedRunId}
              onChange={(e) => {
                setSelectedRunId(e.target.value);
                setPage(1);
              }}
              className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-medium text-slate-800 focus:outline-none"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id}>
                  Run {r.id} ({r.mode}, {r.processed_count.toLocaleString()} entities)
                </option>
              ))}
              {runs.length === 0 && <option value="">No completed runs available</option>}
            </select>
          </div>

          {selectedRunId && (
            <button
              onClick={() => onNavigateToExports(selectedRunId)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition-colors"
            >
              <Download size={13} />
              <span>Export TSVs</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Breakdown Cards for Selected Run */}
      {resultsData && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Total S1 Queries Evaluated</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{resultsData.total_records.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-teal-700">Entities with Predicted Matches</span>
            <div className="text-xl font-bold text-teal-800 mt-1">{resultsData.matched_records.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {resultsData.total_records > 0
                ? `${((resultsData.matched_records / resultsData.total_records) * 100).toFixed(1)}% match rate`
                : '-'}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Singletons (Zero Matches)</span>
            <div className="text-xl font-bold text-slate-800 mt-1">{resultsData.singleton_records.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Correct singletons earn full 1.0 score</div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-3 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Source 1 entity_id (e.g. S1-00001)..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Filter:</span>
          <div className="flex items-center space-x-1 border border-slate-300 rounded p-0.5 bg-slate-50 text-xs">
            {['all', 'matched', 'singletons'].map((ft) => (
              <button
                key={ft}
                onClick={() => {
                  setFilterType(ft);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded font-medium capitalize transition-colors ${
                  filterType === ft ? 'bg-white shadow-2xs text-teal-800 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ft}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3 w-36">Source 1 ID</th>
                <th className="px-4 py-3 w-28">Match Status</th>
                <th className="px-4 py-3">Predicted Matches (S2- / S3-)</th>
                <th className="px-4 py-3 w-36">Blocking Candidates</th>
                <th className="px-4 py-3 w-24 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    Loading predictions...
                  </td>
                </tr>
              ) : !resultsData || resultsData.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    {selectedRunId ? 'No entities match the current search filter.' : 'Please select or run an inference job first.'}
                  </td>
                </tr>
              ) : (
                resultsData.rows.map((row) => (
                  <tr key={row.source1_entity_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.source1_entity_id}</td>
                    <td className="px-4 py-3">
                      {row.is_singleton ? (
                        <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Singleton (0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {row.match_count} Match{row.match_count > 1 ? 'es' : ''}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.matched_entity_ids.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {row.matched_entity_ids.map((mid) => (
                            <span
                              key={mid}
                              className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300 font-medium"
                            >
                              {mid}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Empty match list</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {row.candidate_count} candidates scored
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onSelectEntityForComparison(selectedRunId, row.source1_entity_id)}
                        className="inline-flex items-center space-x-1 text-teal-700 hover:text-teal-900 font-semibold"
                        title="View side-by-side candidate comparison & 21 feature breakdown"
                      >
                        <span>Compare</span>
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server Pagination Footer */}
        {resultsData && resultsData.total_pages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, resultsData.total_records)} of{' '}
              {resultsData.total_records.toLocaleString()} records
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="font-mono font-semibold text-slate-800">
                Page {page} of {resultsData.total_pages}
              </span>
              <button
                disabled={page >= resultsData.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
