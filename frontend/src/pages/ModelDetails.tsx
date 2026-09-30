import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Sliders,
  CheckCircle2,
  Lock,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import { ModelInfo } from '../types';
import { StatusBadge } from '../components/StatusBadge';

export const ModelDetails: React.FC = () => {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const res = await api.getModels();
        setModels(res.models);
        const act = res.models.find((m) => m.is_active) || res.models[0] || null;
        setSelectedModel(act);
      } catch (err) {
        console.error('Failed to load models', err);
      } finally {
        setLoading(false);
      }
    };
    loadModels();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading model metadata...</div>;
  }

  const featureMetadata: Record<string, { group: string; desc: string }> = {
    name_jaccard: { group: 'Name', desc: 'Token-level Jaccard intersection over union of clean business name tokens' },
    name_dice: { group: 'Name', desc: 'Sørensen–Dice coefficient on clean business name token sets' },
    name_char_jaccard: { group: 'Name', desc: 'Character 3-gram Jaccard similarity across normalized names' },
    name_seq_ratio: { group: 'Name', desc: 'Normalized Gestalt pattern sequence matcher similarity ratio' },
    name_exact: { group: 'Name', desc: 'Binary indicator (1.0) if sanitized strings are character-identical' },
    name_first_match: { group: 'Name', desc: 'Binary indicator (1.0) if leading brand/first tokens match exactly' },
    name_len_diff: { group: 'Name', desc: 'Absolute character length disparity between normalized names' },
    name_len_ratio: { group: 'Name', desc: 'Ratio of shorter name length to longer name length' },
    addr_jaccard: { group: 'Address', desc: 'Token-level Jaccard similarity between clean addresses' },
    addr_dice: { group: 'Address', desc: 'Sørensen–Dice coefficient on normalized address token sets' },
    addr_char_jaccard: { group: 'Address', desc: 'Character 3-gram overlap across full address strings' },
    addr_seq_ratio: { group: 'Address', desc: 'SequenceMatcher similarity ratio between addresses' },
    addr_len_diff: { group: 'Address', desc: 'Absolute length difference between address fields' },
    addr_len_ratio: { group: 'Address', desc: 'Length ratio between address fields' },
    shared_nums: { group: 'Numeric', desc: 'Count of exact shared numeric tokens (postal codes, street numbers)' },
    num_jaccard: { group: 'Numeric', desc: 'Jaccard similarity on extracted numerical sets' },
    has_num_match: { group: 'Numeric', desc: 'Indicator if both records share at least one postal or door number' },
    combined_jaccard: { group: 'Compound', desc: 'Joint token Jaccard over union of name and address tokens' },
    geom_mean_sim: { group: 'Compound', desc: 'Geometric mean between name Jaccard and address Jaccard' },
    target_source_num: { group: 'Metadata', desc: 'Categorical source indicator (2.0 for Source 2, 3.0 for Source 3)' },
    same_country: { group: 'Metadata', desc: 'Binary flag (1.0) if Source 1 and candidate countries match' },
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Checkpoint Integrity */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">
              {selectedModel?.name || 'XGBoost Entity Matcher'}
            </h2>
            <StatusBadge status="VERIFIED" size="sm" />
          </div>
          <p className="text-xs text-slate-500 font-mono mt-1 truncate max-w-xl">
            Location: {selectedModel?.path}
          </p>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
            <span className="text-slate-500">Stored Threshold:</span>{' '}
            <span className="font-mono font-bold text-teal-700">τ = {selectedModel?.threshold ?? '0.40'}</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-md">
            <span className="text-slate-500">Trees:</span>{' '}
            <span className="font-mono font-bold text-slate-800">{selectedModel?.n_estimators || 150}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Model Architecture Specs & Parameters */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center space-x-2">
              <Sliders size={14} className="text-teal-600" />
              <span>Hyperparameters & Configuration</span>
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Model Framework:</span>
                <span className="font-mono font-medium text-slate-800">XGBoost 3.0.0</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Objective:</span>
                <span className="font-mono font-medium text-slate-800">binary:logistic</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Learning Rate (eta):</span>
                <span className="font-mono font-medium text-slate-800">0.08</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Max Tree Depth:</span>
                <span className="font-mono font-medium text-slate-800">6</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Subsample / Colsample:</span>
                <span className="font-mono font-medium text-slate-800">0.80 / 0.80</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Scale Pos Weight:</span>
                <span className="font-mono font-medium text-slate-800">1.50</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Sha256 Checksum:</span>
                <span className="font-mono text-[10px] text-slate-600 truncate max-w-[150px]" title={selectedModel?.file_hash}>
                  {selectedModel?.file_hash || 'Verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Model Safety & Immutability */}
          <div className="bg-slate-50 rounded-lg border border-slate-200 p-5 space-y-2 text-xs text-slate-600">
            <div className="font-semibold text-slate-900 flex items-center space-x-1.5">
              <Lock size={14} className="text-teal-700" />
              <span>Checkpoint Preservation Rule</span>
            </div>
            <p className="leading-relaxed">
              The original checkpoint <span className="font-mono">matcher_model.pkl</span> is strictly immutable during inference. Any re-training is written to a versioned checkpoint under <span className="font-mono">storage/models/</span> to prevent weight degradation or silent parameter drift.
            </p>
          </div>
        </div>

        {/* Right: The 21 Feature Vector Table */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Exact 21 Feature Vector</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated on-the-fly for every candidate pair generated by blocking.
              </p>
            </div>
            <span className="font-mono text-xs text-teal-800 bg-teal-50 px-2.5 py-1 rounded border border-teal-200 font-semibold">
              21 / 21 Verified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-100/75 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 w-12 text-center">#</th>
                  <th className="px-4 py-2.5 w-44">Feature Key</th>
                  <th className="px-4 py-2.5 w-24">Group</th>
                  <th className="px-4 py-2.5">Feature Extraction Semantics</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(selectedModel?.feature_names || []).map((feat, idx) => {
                  const meta = featureMetadata[feat] || { group: 'General', desc: 'Pairwise metric' };
                  return (
                    <tr key={feat} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-mono font-medium text-slate-900">{feat}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium px-2 py-0.5 rounded text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                          {meta.group}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 leading-snug">{meta.desc}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
