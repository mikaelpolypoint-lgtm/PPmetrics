import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Topics from './pages/Topics';
import Features from './pages/Features';
import Jira from './pages/Jira';
import Everhour from './pages/Everhour';
import Details from './pages/Details';
import Burndown from './pages/Burndown';
import Metrics from './pages/Metrics';
import SprintMetrics from './pages/SprintMetrics';
import Monatscontrolling from './pages/Monatscontrolling';
import { PIS } from './types';
import CapacityDashboard from './pages/capacity/CapacityDashboard';
import CapacityDevelopers from './pages/capacity/CapacityDevelopers';
import CapacityAvailabilities from './pages/capacity/CapacityAvailabilities';
import CapacityDetails from './pages/capacity/CapacityDetails';
import CapacityChanges from './pages/capacity/CapacityChanges';
import CapacityImprovements from './pages/capacity/CapacityImprovements';

// Helper to sync URL PI with Context PI
const PISync: React.FC = () => {
  const { pi } = useParams<{ pi: string }>();
  const { setCurrentPI, currentPI } = useData();

  useEffect(() => {
    if (pi && PIS.includes(pi) && pi !== currentPI) {
      setCurrentPI(pi);
    }
  }, [pi, currentPI, setCurrentPI]);

  return null;
};

const AppRoutes: React.FC = () => {
  const defaultPI = PIS[0];

  return (
    <Routes>
      <Route path="/" element={<Navigate to={`/${defaultPI}/dashboard`} replace />} />

      <Route path="/:pi/*" element={
        <Layout>
          <PISync />
          <Routes>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="teams" element={<Teams />} />
            <Route path="topics" element={<Topics />} />
            <Route path="features" element={<Features />} />
            <Route path="jira" element={<Jira />} />
            <Route path="burndown" element={<Burndown />} />
            <Route path="everhour" element={<Everhour />} />
            <Route path="details" element={<Details />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="sprint-metrics" element={<SprintMetrics />} />
            <Route path="monatscontrolling" element={<Monatscontrolling />} />

            {/* Capacity Planning Routes */}
            <Route path="capacity-dashboard" element={<CapacityDashboard />} />
            <Route path="capacity-developers" element={<CapacityDevelopers />} />
            <Route path="capacity-availabilities" element={<CapacityAvailabilities />} />
            <Route path="capacity-details" element={<CapacityDetails />} />
            <Route path="capacity-changes" element={<CapacityChanges />} />
            <Route path="capacity-improvements" element={<CapacityImprovements />} />

            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
};

import AuthGate from './components/AuthGate';

function App() {
  return (
    <DataProvider>
      <AuthGate>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthGate>
    </DataProvider>
  );
}

export default App;
