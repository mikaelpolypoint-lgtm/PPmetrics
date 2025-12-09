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
import { PIS } from './types';

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
            <Route path="*" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  );
};

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
