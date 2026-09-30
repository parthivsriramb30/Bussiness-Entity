import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Datasets } from './pages/Datasets';
import { Results } from './pages/Results';
import { EntityComparison } from './pages/EntityComparison';
import { Exports } from './pages/Exports';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('comparison');
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [comparisonS1Id, setComparisonS1Id] = useState<string | null>(null);

  const handleSelectEntityForComparison = (runId: string, s1Id: string) => {
    setActiveRunId(runId);
    setComparisonS1Id(s1Id);
    setCurrentTab('comparison');
  };

  const handleNavigateToExports = (runId: string) => {
    setActiveRunId(runId);
    setCurrentTab('exports');
  };

  return (
    <Layout currentTab={currentTab} onTabChange={setCurrentTab}>
      {currentTab === 'comparison' && (
        <EntityComparison
          runId={activeRunId || 'default'}
          s1Id={comparisonS1Id || 'S1-00001'}
          onBack={() => setCurrentTab('results')}
        />
      )}
      {currentTab === 'results' && (
        <Results
          activeRunId={activeRunId}
          onSelectEntityForComparison={handleSelectEntityForComparison}
          onNavigateToExports={handleNavigateToExports}
        />
      )}
      {currentTab === 'datasets' && <Datasets />}
      {currentTab === 'exports' && <Exports initialRunId={activeRunId} />}
    </Layout>
  );
}

export default App;
