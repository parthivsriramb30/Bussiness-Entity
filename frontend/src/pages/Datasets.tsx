import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Check,
  Eye,
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { DatasetInfo, DatasetValidationResult } from '../types';

export const Datasets: React.FC = () => {
  const [datasets, setDatasets] = useState<DatasetInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<DatasetInfo | null>(null);
  const [folderPathInput, setFolderPathInput] = useState('');
  const [folderNameInput, setFolderNameInput] = useState('');
  const [registering, setRegistering] = useState(false);
  const [validationResult, setValidationResult] = useState<DatasetValidationResult | null>(null);
  const [validating, setValidating] = useState(false);

  // Table preview states
  const [previewTable, setPreviewTable] = useState('test_source1');
  const [previewData, setPreviewData] = useState<Record<string, string>[]>([]);
  const [previewTotal, setPreviewTotal] = useState(0);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewCountry, setPreviewCountry] = useState('ALL');
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchDatasets = async () => {
    try {
      const res = await api.getDatasets();
      setDatasets(res.datasets);
      setActiveId(res.active_dataset_id || null);
      if (res.datasets.length > 0 && !selectedDataset) {
        setSelectedDataset(res.datasets[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleRegisterFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderPathInput.trim()) return;
    setRegistering(true);
    try {
      await api.registerFolder(folderPathInput.trim(), folderNameInput.trim() || undefined);
      setFolderPathInput('');
      setFolderNameInput('');
      await fetchDatasets();
    } catch (err: any) {
      alert(`Registration failed: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      await api.setActiveDataset(id);
      setActiveId(id);
      await fetchDatasets();
    } catch (err: any) {
      alert(`Failed to set active dataset: ${err.message}`);
    }
  };

  const handleRunValidation = async (path?: string) => {
    setValidating(true);
    try {
      const res = await api.validateDataset(path);
      setValidationResult(res);
    } catch (err: any) {
      alert(`Validation error: ${err.message}`);
    } finally {
      setValidating(false);
    }
  };

  // Fetch table preview
  useEffect(() => {
    if (!selectedDataset || selectedDataset.status === 'placeholder') {
      setPreviewData([]);
      setPreviewTotal(0);
      return;
    }

    const loadPreview = async () => {
      setPreviewLoading(true);
      try {
        const res = await api.previewTable(
          selectedDataset.id,
          previewTable,
          previewPage,
          15,
          previewSearch || undefined,
          previewCountry !== 'ALL' ? previewCountry : undefined
        );
        setPreviewData(res.rows);
        setPreviewTotal(res.total);
      } catch (err) {
        console.error('Preview error', err);
        setPreviewData([]);
        setPreviewTotal(0);
      } finally {
        setPreviewLoading(false);
      }
    };

    const timer = setTimeout(loadPreview, 300);
    return () => clearTimeout(timer);
  }, [selectedDataset, previewTable, previewPage, previewSearch, previewCountry]);

  return (
    <div className="space-y-6">
      {/* Top Action Bar: Register Folder / Validate */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 mb-2">Register Existing Dataset Folder or Archive</h2>
        <p className="text-xs text-slate-500 mb-4">
          Point to a directory containing the 7 challenge TSV files (e.g. <span className="font-mono">D:\archive</span> or <span className="font-mono">dataset/</span>). The system validates schemas, checks for header-only placeholders, and records country coverage.
        </p>
        <form onSubmit={handleRegisterFolder} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Dataset Directory Path</label>
            <input
              type="text"
              placeholder="e.g. D:\archive or dataset"
              value={folderPathInput}
              onChange={(e) => setFolderPathInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="sm:col-span-4 space-y-1">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">Display Label</label>
            <input
              type="text"
              placeholder="e.g. Amazon ML Challenge 2026 Mirror"
              value={folderNameInput}
              onChange={(e) => setFolderNameInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={registering || !folderPathInput.trim()}
              className="w-full inline-flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white px-3 py-2 rounded-md text-xs font-medium transition-colors"
            >
              <FolderPlus size={14} />
              <span>{registering ? 'Validating...' : 'Register'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Dataset Selection & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Registered Datasets List */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">Registered Datasets</h3>
            <span className="text-xs text-slate-500">{datasets.length} configured</span>
          </div>
          <div className="divide-y divide-slate-100">
            {datasets.map((ds) => {
              const isSelected = selectedDataset?.id === ds.id;
              const isActive = activeId === ds.id;
              return (
                <div
                  key={ds.id}
                  onClick={() => setSelectedDataset(ds)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? 'bg-teal-50/60 border-l-4 border-teal-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-sm text-slate-900 flex items-center space-x-2">
                        <span>{ds.name}</span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[200px]" title={ds.path}>
                        {ds.path}
                      </div>
                    </div>
                    <StatusBadge status={ds.status} size="sm" />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {ds.status === 'placeholder'
                        ? 'Header-only placeholders'
                        : `${ds.train_records.toLocaleString()} Train | ${ds.test_records.toLocaleString()} Test`}
                    </span>
                    {!isActive && ds.status === 'ready' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetActive(ds.id);
                        }}
                        className="text-teal-700 hover:text-teal-800 font-semibold"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Dataset Audit & Schema Check */}
        <div className="lg:col-span-2 space-y-6">
          {selectedDataset && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{selectedDataset.name}</h3>
                  <div className="text-xs font-mono text-slate-500 mt-1">{selectedDataset.path}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={selectedDataset.status} />
                  <button
                    onClick={() => handleRunValidation(selectedDataset.path)}
                    disabled={validating}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                  >
                    <RefreshCw size={12} className={validating ? 'animate-spin' : ''} />
                    <span>Re-Validate</span>
                  </button>
                </div>
              </div>

              {/* Placeholder Warning if applicable */}
              {selectedDataset.status === 'placeholder' && (
                <div className="p-4 rounded-md bg-amber-50 border border-amber-300 text-amber-900 text-xs leading-relaxed space-y-1">
                  <div className="font-semibold flex items-center space-x-1.5">
                    <AlertTriangle size={15} className="text-amber-700 shrink-0" />
                    <span>Dataset Missing — Starter Placeholders Detected</span>
                  </div>
                  <div>
                    This directory contains the original ~49-byte header-only TSV files. The application strictly rejects placeholder files to prevent corrupted inference. Point to the extracted mirror folder (<span className="font-mono">D:\archive</span> or <span className="font-mono">archive.zip</span>) to proceed.
                  </div>
                </div>
              )}

              {/* Schema Requirements Checklist */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                  7-File Challenge Schema Inspection
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { name: 'train_source1.tsv', role: 'Reference training records (S1-)', reqCols: 'entity_id, business_name, business_address, country' },
                    { name: 'train_source2.tsv', role: 'Source 2 training records (S2-)', reqCols: 'entity_id, business_name, business_address, country' },
                    { name: 'train_source3.tsv', role: 'Source 3 training records (S3-)', reqCols: 'entity_id, business_name, business_address, country' },
                    { name: 'train_ground_truth.tsv', role: 'Training match labels', reqCols: 'source1_entity_id, matched_entity_ids' },
                    { name: 'test_source1.tsv', role: 'Reference test records (S1-)', reqCols: 'entity_id, business_name, business_address, country' },
                    { name: 'test_source2.tsv', role: 'Source 2 test records (S2-)', reqCols: 'entity_id, business_name, business_address, country' },
                    { name: 'test_source3.tsv', role: 'Source 3 test records (S3-)', reqCols: 'entity_id, business_name, business_address, country' },
                  ].map((f) => (
                    <div key={f.name} className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                      <div className="flex items-center justify-between font-mono font-medium text-slate-800">
                        <span>{f.name}</span>
                        {selectedDataset.status === 'ready' ? (
                          <CheckCircle2 size={14} className="text-emerald-600" />
                        ) : (
                          <AlertTriangle size={14} className="text-amber-600" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{f.role}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Interactive Paginated TSV Explorer */}
          {selectedDataset && selectedDataset.status === 'ready' && (
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900">Server-Side Data Browser</h3>
                {/* Table Picker */}
                <select
                  value={previewTable}
                  onChange={(e) => {
                    setPreviewTable(e.target.value);
                    setPreviewPage(1);
                  }}
                  className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:outline-none"
                >
                  <option value="test_source1">test_source1.tsv (Reference Test)</option>
                  <option value="test_source2">test_source2.tsv (Source 2 Targets)</option>
                  <option value="test_source3">test_source3.tsv (Source 3 Targets)</option>
                  <option value="train_source1">train_source1.tsv (Reference Train)</option>
                  <option value="train_ground_truth">train_ground_truth.tsv (Labels)</option>
                </select>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 relative">
                  <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by entity_id, name, or address..."
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value);
                      setPreviewPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md pl-9 pr-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="sm:col-span-4">
                  <select
                    value={previewCountry}
                    onChange={(e) => {
                      setPreviewCountry(e.target.value);
                      setPreviewPage(1);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="ALL">All Countries</option>
                    <option value="US">US</option>
                    <option value="India">India</option>
                    <option value="France">France</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-md">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2 w-28">Entity ID</th>
                      <th className="px-3 py-2 w-48">Business Name</th>
                      <th className="px-3 py-2">Address</th>
                      <th className="px-3 py-2 w-20">Country</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewLoading ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                          Loading records from disk...
                        </td>
                      </tr>
                    ) : previewData.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400">
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      previewData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono font-medium text-slate-900">{row.entity_id || row.source1_entity_id}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{row.business_name || row.matched_entity_ids || '-'}</td>
                          <td className="px-3 py-2 text-slate-600 truncate max-w-xs">{row.business_address || '-'}</td>
                          <td className="px-3 py-2">
                            {row.country ? (
                              <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {row.country}
                              </span>
                            ) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <span>Showing {previewData.length} of {previewTotal.toLocaleString()} records</span>
                <div className="flex items-center space-x-2">
                  <button
                    disabled={previewPage <= 1}
                    onClick={() => setPreviewPage((p) => p - 1)}
                    className="px-2.5 py-1 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50"
                  >
                    Previous
                  </button>
                  <span className="font-mono text-slate-700">Page {previewPage}</span>
                  <button
                    disabled={previewData.length < 15}
                    onClick={() => setPreviewPage((p) => p + 1)}
                    className="px-2.5 py-1 border border-slate-300 rounded disabled:opacity-40 hover:bg-slate-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
