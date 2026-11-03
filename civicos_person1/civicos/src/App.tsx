import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="CivicOS Application Recovered">
      <Router>
        <AppRoutes />
      </Router>
    </ErrorBoundary>
  );
};

export default App;
