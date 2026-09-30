import React, { useState, useEffect } from 'react';
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  Sliders,
  Send,
  UserCheck,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Search,
  Layers,
  ArrowLeftRight,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';
import { ComparisonResponse, CandidateComparisonItem, AuditReview } from '../types';

interface EntityComparisonProps {
  runId: string;
  s1Id: string;
  onBack: () => void;
}

export const EntityComparison: React.FC<EntityComparisonProps> = ({ runId, s1Id, onBack }) => {
  // Mode: 'live' (direct comparison tool) or 'dataset' (inspect run results)
  const [tabMode, setTabMode] = useState<'live' | 'dataset'>('live');

  // Live comparison form state
  const [name1, setName1] = useState('Orelee\'s Barbershop');
  const [address1, setAddress1] = useState('1795 Westchester Drive, High Point, NC');
  const [country1, setCountry1] = useState('US');

  const [name2, setName2] = useState('Orelee Barbershop LLC');
  const [address2, setAddress2] = useState('1795 Westchester Dr, Suite 2, High Point, NC');
  const [country2, setCountry2] = useState('US');

  const [customThreshold, setCustomThreshold] = useState<number>(0.40);
  const [liveResult, setLiveResult] = useState<any | null>(null);
  const [comparing, setComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Dataset run comparison state
  const [data, setData] = useState<ComparisonResponse | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateComparisonItem | null>(null);
  const [auditReviews, setAuditReviews] = useState<AuditReview[]>([]);
  const [reviewerName, setReviewerName] = useState('Parthiv (Lead Reviewer)');
  const [decision, setDecision] = useState('agreed');
  const [notes, setNotes] = useState('');
  const [submittingAudit, setSubmittingAudit] = useState(false);
  const [datasetLoading, setDatasetLoading] = useState(false);

  // Challenge presets for rapid testing
  const presets = [
    {
      label: '1. Name & Address Abbreviation Match',
      n1: 'Orelee\'s Barbershop Inc',
      a1: '1795 Westchester Drive, High Point, NC',
      c1: 'US',
      n2: 'Orelee Barbershop LLC',
      a2: '1795 Westchester Dr, High Point, NC',
      c2: 'US',
    },
    {
      label: '2. French Zero-Shot Diacritics Match',
      n1: 'Société Café de Paris SARL',
      a1: '15 Rue de l\'Étoile, Paris',
      c1: 'France',
      n2: 'Societe Cafe de Paris',
      a2: '15 rue de l\'Etoile, Paris',
      c2: 'France',
    },
    {
      label: '3. Indian Landmark & Name Variation',
      n1: 'Prabhav Business Center Pvt Ltd',
      a1: '797 Lake Town Block A, Kolkata, West Bengal',
      c1: 'India',
      n2: 'Prabhav Business Centre',
      a2: '797 Lake Town Near SBI ATM, Kolkata',
      c2: 'India',
    },
    {
      label: '4. Disparate Businesses (Different Entities)',
      n1: 'Apex Healthcare Services Inc',
      a1: '400 Pine Street, Dallas, TX',
      c1: 'US',
      n2: 'Apex Logistics & Freight LLC',
      a2: '1200 Industrial Parkway, Chicago, IL',
      c2: 'US',
    },
  ];

  const applyPreset = (p: typeof presets[0]) => {
    setName1(p.n1);
    setAddress1(p.a1);
    setCountry1(p.c1);
    setName2(p.n2);
    setAddress2(p.a2);
    setCountry2(p.c2);
    runLiveComparison(p.n1, p.a1, p.c1, p.n2, p.a2, p.c2);
  };

  const handleSwap = () => {
    const tempN = name1;
    const tempA = address1;
    const tempC = country1;
    setName1(name2);
    setAddress1(address2);
    setCountry1(country2);
    setName2(tempN);
    setAddress2(tempA);
    setCountry2(tempC);
    runLiveComparison(name2, address2, country2, tempN, tempA, tempC);
  };

  const handleClear = () => {
    setName1('');
    setAddress1('');
    setName2('');
    setAddress2('');
    setLiveResult(null);
  };

  const runLiveComparison = async (
    n1 = name1,
    a1 = address1,
    c1 = country1,
    n2 = name2,
    a2 = address2,
    c2 = country2,
    retryCount = 0
  ) => {
    setComparing(true);
    setComparisonError(null);
    try {
      const res = await api.liveCompare({
        name1: n1,
        address1: a1,
        country1: c1,
        name2: n2,
        address2: a2,
        country2: c2,
        threshold: customThreshold,
      });
      setLiveResult(res);
      setComparisonError(null);
    } catch (err: any) {
      if (retryCount < 3 && (err.message?.includes('fetch') || err.message?.includes('Network') || err.message?.includes('Failed'))) {
        // Backend service might still be finishing startup, retry after 1.5s
        setTimeout(() => {
          runLiveComparison(n1, a1, c1, n2, a2, c2, retryCount + 1);
        }, 1500);
      } else {
        setComparisonError(err.message || 'Unable to connect to ML backend service');
      }
    } finally {
      setComparing(false);
    }
  };

  // Run initial live comparison on load
  useEffect(() => {
    runLiveComparison();
  }, []);

  // Load dataset run details if switched to dataset tab
  useEffect(() => {
    if (tabMode === 'dataset') {
      const loadDetails = async () => {
        setDatasetLoading(true);
        try {
          const [compRes, auditRes] = await Promise.all([
            api.getComparison(runId, s1Id),
            api.getAuditReviews(runId),
          ]);
          setData(compRes);
          if (compRes.candidates.length > 0) {
            setSelectedCandidate(compRes.candidates[0]);
          }
          setAuditReviews(auditRes.filter((a) => a.source1_id === s1Id));
        } catch (err) {
          console.error(err);
        } finally {
          setDatasetLoading(false);
        }
      };
      loadDetails();
    }
  }, [tabMode, runId, s1Id]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim()) return;
    setSubmittingAudit(true);
    try {
      const added = await api.addAuditReview({
        run_id: runId,
        source1_id: s1Id,
        reviewer_name: reviewerName.trim(),
        decision,
        notes: notes.trim(),
      });
      setAuditReviews([added, ...auditReviews]);
      setNotes('');
    } catch (err: any) {
      alert(`Failed to save reviewer note: ${err.message}`);
    } finally {
      setSubmittingAudit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Mode Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <GitCompare size={18} className="text-teal-600" />
            <span>Business Entity Comparison & Live Matcher</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare two business entities side-by-side and evaluate their match probability with the trained XGBoost model.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1 border border-slate-300 rounded p-1 bg-slate-50 text-xs font-medium">
          <button
            onClick={() => setTabMode('live')}
            className={`px-3 py-1.5 rounded transition-colors ${
              tabMode === 'live' ? 'bg-white shadow-2xs text-teal-800 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Entity Comparator
          </button>
          <button
            onClick={() => setTabMode('dataset')}
            className={`px-3 py-1.5 rounded transition-colors ${
              tabMode === 'dataset' ? 'bg-white shadow-2xs text-teal-800 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dataset Run Inspector
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: LIVE INTERACTIVE COMPARATOR                                      */}
      {/* ========================================================================= */}
      {tabMode === 'live' && (
        <div className="space-y-6">
          {/* Connection / Inference Error Notification */}
          {comparisonError && (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-950 text-xs shadow-2xs">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">ML Backend Connection: </span>
                  <span>{comparisonError}. The server might still be initializing.</span>
                </div>
              </div>
              <button
                onClick={() => runLiveComparison()}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold transition-colors shrink-0 shadow-2xs"
              >
                Retry Now
              </button>
            </div>
          )}

          {/* Quick Preset Buttons & Actions */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1.5 flex-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Quick Challenge Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => applyPreset(p)}
                    className="px-3 py-1 rounded bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-300 border border-slate-200 text-xs font-medium text-slate-700 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
              <button
                type="button"
                onClick={handleSwap}
                disabled={!name1 && !name2}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-xs font-medium text-slate-700 border border-slate-300 transition-colors"
                title="Swap Entity 1 and Entity 2"
              >
                <ArrowLeftRight size={13} />
                <span>Swap</span>
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 text-xs font-medium text-slate-600 border border-slate-300 transition-colors"
                title="Clear all fields"
              >
                <Trash2 size={13} />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Two Input Boxes Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            {/* Business Record 1 */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                  Business Entity #1 (Reference Query)
                </span>
                <span className="text-xs text-slate-400 font-mono">Source 1</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Business Name</label>
                  <input
                    type="text"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') runLiveComparison(); }}
                    placeholder="e.g. Orelee's Barbershop Inc"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Business Address</label>
                  <textarea
                    rows={2}
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    placeholder="e.g. 1795 Westchester Drive, High Point, NC"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Country:</label>
                  <select
                    value={country1}
                    onChange={(e) => setCountry1(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-medium text-slate-800"
                  >
                    <option value="US">US (United States)</option>
                    <option value="India">India</option>
                    <option value="France">France</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Business Record 2 */}
            <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  Business Entity #2 (Target Candidate)
                </span>
                <span className="text-xs text-slate-400 font-mono">Source 2 / 3</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Business Name</label>
                  <input
                    type="text"
                    value={name2}
                    onChange={(e) => setName2(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') runLiveComparison(); }}
                    placeholder="e.g. Orelee Barbershop LLC"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Business Address</label>
                  <textarea
                    rows={2}
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    placeholder="e.g. 1795 Westchester Dr, Suite 2, High Point, NC"
                    className="w-full bg-slate-50 border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">Country:</label>
                  <select
                    value={country2}
                    onChange={(e) => setCountry2(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-medium text-slate-800"
                  >
                    <option value="US">US (United States)</option>
                    <option value="India">India</option>
                    <option value="France">France</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Trigger Button & Threshold Slider */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-xs">
              <span className="font-semibold text-slate-700">Decision Threshold (τ):</span>
              <input
                type="range"
                min="0.10"
                max="0.90"
                step="0.05"
                value={customThreshold}
                onChange={(e) => setCustomThreshold(parseFloat(e.target.value))}
                className="w-36 text-teal-600 cursor-pointer"
              />
              <span className="font-mono font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {customThreshold.toFixed(2)}
              </span>
              <span className="text-slate-400 text-[11px]">(Default: 0.40)</span>
            </div>

            <button
              onClick={() => runLiveComparison()}
              disabled={comparing || !name1.trim() || !name2.trim()}
              className="inline-flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-md text-sm font-semibold transition-colors shadow-2xs"
            >
              <Play size={16} />
              <span>{comparing ? 'Computing Features & Scoring...' : 'Compare Entities with ML Model'}</span>
            </button>
          </div>

          {/* Result Display Banner */}
          {liveResult && (
            <div className="space-y-6">
              {/* Decision Box with Visual Probability Meter */}
              <div
                className={`rounded-lg border p-6 shadow-xs ${
                  liveResult.is_match
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50/70 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      {liveResult.is_match ? (
                        <CheckCircle2 size={24} className="text-emerald-700 shrink-0" />
                      ) : (
                        <XCircle size={24} className="text-rose-700 shrink-0" />
                      )}
                      <span className="text-lg font-bold tracking-tight">
                        {liveResult.is_match
                          ? 'MATCH ACCEPTED: Same Real-World Business Entity'
                          : 'MATCH REJECTED: Distinct Non-Matching Entities'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">
                      {liveResult.is_match
                        ? `Model predicted probability exceeds decision threshold (${liveResult.score} >= ${liveResult.threshold}). Entity will be included in matching_results.tsv.`
                        : `Model predicted probability is below decision threshold (${liveResult.score} < ${liveResult.threshold}). Falsely merging this entity would damage the precision-heavy macro F0.5 score.`}
                    </p>
                  </div>

                  <div className="flex items-center space-x-4 bg-white/90 p-4 rounded-lg border border-slate-200 shrink-0 text-center">
                    <div>
                      <div className="text-[11px] font-semibold uppercase text-slate-500">Model Score</div>
                      <div
                        className={`text-2xl font-mono font-bold ${
                          liveResult.is_match ? 'text-emerald-800' : 'text-rose-800'
                        }`}
                      >
                        {liveResult.score.toFixed(4)}
                      </div>
                    </div>
                    <div className="text-slate-300 text-xl font-light">/</div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase text-slate-500">Threshold (τ)</div>
                      <div className="text-2xl font-mono font-bold text-slate-800">
                        {liveResult.threshold.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual Probability Meter & Threshold Marker */}
                <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700 flex items-center space-x-2">
                      <span>Match Probability Spectrum:</span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        liveResult.score >= 0.85
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : liveResult.is_match
                          ? 'bg-teal-100 text-teal-800 border border-teal-300'
                          : liveResult.score >= liveResult.threshold - 0.15
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {liveResult.score >= 0.85
                          ? 'Very High Confidence Match'
                          : liveResult.is_match
                          ? 'Accepted Match (≥ Threshold)'
                          : liveResult.score >= liveResult.threshold - 0.15
                          ? 'Borderline Non-Match'
                          : 'Distinct Non-Matching Entities'}
                      </span>
                    </span>
                    <span className="font-mono text-slate-500 text-[11px]">Score: {(liveResult.score * 100).toFixed(1)}%</span>
                  </div>

                  <div className="w-full bg-slate-200 h-3.5 rounded-full relative overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        liveResult.is_match ? 'bg-emerald-600' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, liveResult.score * 100))}%` }}
                    />
                    {/* Threshold Cutoff Marker Line */}
                    <div
                      className="absolute top-0 bottom-0 w-1 bg-slate-900 z-10 shadow-xs"
                      style={{ left: `${liveResult.threshold * 100}%` }}
                      title={`Decision Cutoff Threshold: ${liveResult.threshold}`}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>0.00 (Disparate)</span>
                    <span className="font-bold text-slate-800 bg-slate-100/90 px-1.5 py-0.5 rounded border border-slate-300">
                      Threshold Cutoff (τ = {liveResult.threshold.toFixed(2)})
                    </span>
                    <span>1.00 (Identical)</span>
                  </div>
                </div>
              </div>

              {/* Text Normalization Audit */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Text Normalization & Sanitization Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5 font-mono">
                    <span className="text-slate-500 font-sans font-semibold block text-[11px]">Entity 1 Normalized:</span>
                    <div>Name: <span className="text-slate-900 font-bold">{liveResult.entity1.clean_name || '(empty)'}</span></div>
                    <div>Address: <span className="text-slate-700">{liveResult.entity1.clean_address || '(empty)'}</span></div>
                    <div>Extracted Numbers: <span className="text-teal-700 font-bold">{liveResult.entity1.numbers.join(', ') || 'None'}</span></div>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1.5 font-mono">
                    <span className="text-slate-500 font-sans font-semibold block text-[11px]">Entity 2 Normalized:</span>
                    <div>Name: <span className="text-slate-900 font-bold">{liveResult.entity2.clean_name || '(empty)'}</span></div>
                    <div>Address: <span className="text-slate-700">{liveResult.entity2.clean_address || '(empty)'}</span></div>
                    <div>Extracted Numbers: <span className="text-teal-700 font-bold">{liveResult.entity2.numbers.join(', ') || 'None'}</span></div>
                  </div>
                </div>
                {liveResult.shared_numbers.length > 0 && (
                  <div className="text-xs text-teal-800 bg-teal-50 px-3 py-1.5 rounded border border-teal-200 font-medium">
                    Strong postal/street number agreement: <span className="font-mono font-bold">{liveResult.shared_numbers.join(', ')}</span>
                  </div>
                )}
              </div>

              {/* Complete 21 Feature Vector Display */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
                    <Sliders size={14} className="text-teal-600" />
                    <span>Exact 21-Feature Vector Passed to XGBoost</span>
                  </h3>
                  <span className="text-xs font-mono font-bold text-slate-700">21 Features Calculated</span>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(liveResult.features || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-600 truncate max-w-[160px]" title={key}>{key}</span>
                        <span className="font-mono font-bold text-slate-900">
                          {typeof val === 'number' ? val.toFixed(3) : String(val)}
                        </span>
                      </div>
                      {typeof val === 'number' && val >= 0 && val <= 1 && (
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${val >= 0.7 ? 'bg-teal-600' : 'bg-slate-400'}`}
                            style={{ width: `${Math.min(100, Math.max(0, val * 100))}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: DATASET RUN ENTITY INSPECTOR                                     */}
      {/* ========================================================================= */}
      {tabMode === 'dataset' && (
        <div className="space-y-6">
          {datasetLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Loading dataset query comparison...</div>
          ) : !data ? (
            <div className="bg-white p-8 rounded-lg border border-slate-200 text-center space-y-3">
              <div className="text-slate-600 text-sm">
                No candidate records found for Source 1 entity: <strong className="font-mono">{s1Id}</strong> in run <strong className="font-mono">{runId}</strong>.
              </div>
              <p className="text-xs text-slate-500">
                You can run an inference job from the <span className="font-semibold text-teal-700">Run Resolution</span> page or use the <span className="font-semibold text-teal-700">Live Entity Comparator</span> above to test any records instantly.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Side-by-Side Comparison Container */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Source 1 Query Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Reference Query (Source 1)
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-900">{data.s1_id}</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-medium block">Business Name</span>
                      <div className="text-sm font-semibold text-slate-900 mt-0.5">{data.s1_name}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block">Business Address</span>
                      <div className="text-xs text-slate-800 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200 font-mono">
                        {data.s1_addr}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-slate-500 font-medium">Country Label:</span>
                      <span className="font-mono font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                        {data.s1_country}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Candidate Target Card */}
                <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                      Target Candidate ({selectedCandidate?.cand_id || '-'})
                    </span>
                    {selectedCandidate && (
                      <span
                        className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold ${
                          selectedCandidate.is_match
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        {selectedCandidate.is_match ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{selectedCandidate.is_match ? 'MATCH ACCEPTED' : 'CANDIDATE REJECTED'}</span>
                      </span>
                    )}
                  </div>

                  {selectedCandidate ? (
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-slate-500 font-medium block">Candidate Name</span>
                        <div className="text-sm font-semibold text-slate-900 mt-0.5">{selectedCandidate.cand_name}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block">Candidate Address</span>
                        <div className="text-xs text-slate-800 mt-0.5 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200 font-mono">
                          {selectedCandidate.cand_addr}
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-slate-500 font-medium">
                          Model Score vs Threshold (τ = {selectedCandidate.threshold}):
                        </span>
                        <span
                          className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                            selectedCandidate.is_match ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {selectedCandidate.score.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">No candidate selected.</div>
                  )}
                </div>
              </div>

              {/* Candidate Switcher Tabs */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Scored Candidates for this Query ({data.candidates.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.candidates.map((cand) => {
                    const isSelected = selectedCandidate?.cand_id === cand.cand_id;
                    return (
                      <button
                        key={cand.cand_id}
                        onClick={() => setSelectedCandidate(cand)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-mono transition-all ${
                          isSelected ? 'bg-slate-900 text-white font-bold' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <span>{cand.cand_id}</span>
                        <span
                          className={`text-[10px] px-1 py-0.2 rounded font-sans font-semibold ${
                            cand.is_match ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                          }`}
                        >
                          {cand.score.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reviewer Audit Notes */}
              <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center space-x-2">
                  <UserCheck size={16} className="text-teal-600" />
                  <span>Reviewer Verification Notes</span>
                </h3>
                <form onSubmit={handleAddReview} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={reviewerName}
                    onChange={(e) => setReviewerName(e.target.value)}
                    placeholder="Reviewer Name"
                    className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900"
                  />
                  <select
                    value={decision}
                    onChange={(e) => setDecision(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded px-3 py-1.5 text-xs text-slate-900"
                  >
                    <option value="agreed">Agreed with Model Decision</option>
                    <option value="disagreed">Disagreed</option>
                    <option value="flagged">Flagged for Review</option>
                  </select>
                  <button
                    type="submit"
                    disabled={submittingAudit || !reviewerName.trim()}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded px-3 py-1.5 text-xs font-medium"
                  >
                    Save Review
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
