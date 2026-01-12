import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { DataProvider, useData } from './context/DataContext';
import { AuthProvider } from './lib/auth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import CalendarPage from './pages/Calendar';
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
import EverhourCapacities from './pages/EverhourCapacities';
import { PIS } from './types';
import CapacityDashboard from './pages/capacity/CapacityDashboard';
import CapacityDevelopers from './pages/capacity/CapacityDevelopers';
import CapacityAvailabilities from './pages/capacity/CapacityAvailabilities';
import CapacityDetails from './pages/capacity/CapacityDetails';
import CapacityTeamDetails from './pages/capacity/CapacityTeamDetails';
import CapacityChanges from './pages/capacity/CapacityChanges';


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
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="teams" element={<Teams />} />
            <Route path="topics" element={<Topics />} />
            <Route path="features" element={<Features />} />
            <Route path="jira" element={<Jira />} />
            <Route path="burndown" element={<Burndown />} />
            <Route path="everhour" element={<Everhour />} />
            <Route path="everhour-capacities" element={<EverhourCapacities />} />
            <Route path="details" element={<Details />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="sprint-metrics" element={<SprintMetrics />} />
            <Route path="monatscontrolling" element={<Monatscontrolling />} />

            {/* Capacity Planning Routes */}
            <Route path="capacity-dashboard" element={<CapacityDashboard />} />
            <Route path="capacity-developers" element={<CapacityDevelopers />} />
            <Route path="capacity-availabilities" element={<CapacityAvailabilities />} />
            <Route path="capacity-details" element={<CapacityDetails />} />
            <Route path="capacity-team-details" element={<CapacityTeamDetails />} />
            <Route path="capacity-changes" element={<CapacityChanges />} />


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
    <AuthProvider>
      <DataProvider>
        <AuthGate>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthGate>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
