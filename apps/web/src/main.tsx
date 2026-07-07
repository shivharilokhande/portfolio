import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// StrictMode disabled intentionally. React 18 StrictMode's double-mount in dev
// interacted badly with framer-motion — animations were being interrupted
// mid-transition, leaving sections and admin tiles frozen at partial opacity.
// Effects still run correctly without StrictMode; we accept the loss of the
// double-invoke warning safety net.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ErrorBoundary>,
);
