import React, { useState, useEffect } from 'react';
import {
  TableProperties,
  GitCompare,
  Database,
  Download,
  Layers
} from 'lucide-react';
import { api } from '../api/client';
import { DatasetInfo, ModelInfo } from '../types';

interface LayoutProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentTab, onTabChange, children }) => {
  const [activeDataset, setActiveDataset] = useState<DatasetInfo | null>(null);
  const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [dsRes, mRes] = await Promise.all([
          api.getDatasets(),
          api.getModels(),
        ]);
        const actDs = dsRes.datasets.find((d) => d.is_active) || dsRes.datasets[0] || null;
        const actM = mRes.models.find((m) => m.is_active) || mRes.models[0] || null;
        setActiveDataset(actDs);
        setActiveModel(actM);
      } catch (err) {
        console.error('Failed to load header status', err);
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'comparison', label: 'Entity Comparison & Results', icon: <GitCompare size={18} /> },
    { id: 'results', label: 'Dataset Match Results', icon: <TableProperties size={18} /> },
    { id: 'datasets', label: 'Datasets', icon: <Database size={18} /> },
    { id: 'exports', label: 'Exports & Submit', icon: <Download size={18} /> },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Left Side Column (Sidebar) */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Layers size={18} />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white text-base">EntityMatch</span>
              <span className="ml-2 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                ML Challenge
              </span>
            </div>
          </div>
        </div>

        {/* Left Side Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-lg text-sm font-medium transition-all text-left ${
                  isActive
                    ? 'bg-teal-600 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span className={isActive ? 'text-white' : 'text-teal-400'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Left Column Footer: Dataset & Model Status */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 space-y-3 shrink-0">
          {activeDataset && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Dataset</div>
              <div className="text-xs text-white font-medium truncate" title={activeDataset.name}>
                {activeDataset.name}
              </div>
            </div>
          )}

          {activeModel && (
            <div className="space-y-1">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Active Model</div>
              <div className="flex items-center justify-between text-xs text-white">
                <span className="font-medium truncate">{activeModel.name}</span>
                <span className="font-mono text-teal-300 text-[10px] bg-teal-950 px-1.5 py-0.5 rounded border border-teal-800">
                  τ = {activeModel.threshold}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between shrink-0 shadow-2xs">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>{navItems.find((n) => n.id === currentTab)?.label || 'EntityMatch'}</span>
          </h1>

          <div className="flex items-center space-x-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-600 font-medium">ML Engine Online</span>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
