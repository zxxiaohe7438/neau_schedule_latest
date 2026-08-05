import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import '@fontsource/orbitron/500.css';
import '@fontsource/orbitron/700.css';
import '../styles/global.css';
import '../styles/reminder.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
