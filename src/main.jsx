import React from 'react';
import { createRoot } from 'react-dom/client';
import { configured } from './firebase';
import App from './App';
import './styles.css';

const Setup = () => (
  <div className="wrap page narrow">
    <h1 className="h1">Setup needed</h1>
    <p className="muted">Firebase is not connected yet. Copy <code>.env.example</code> to <code>.env</code>, paste your Firebase web app config, then restart <code>npm run dev</code>. See README.md for the steps.</p>
  </div>
);

createRoot(document.getElementById('root')).render(configured ? <App /> : <Setup />);
